import fs from 'fs'
import path from 'path'
import xml2js from 'xml2js'

class ResultBuilder {
  constructor() {

  }

  // get a first key found in this obj  
  getValue(json, theKey) {
    if (json === '') return
    function traverse(obj, key) {
      if (obj === '') return

      if (obj[key] === undefined) {
        for (let i in obj) {
          if (obj.hasOwnProperty(i) && typeof obj[i] === 'object') {
            let result = traverse(obj[i], key)
            if (result !== null)
              return result
          }
        }
        return null
      } else {
        return obj[key]
      }
    }

    return traverse(json, theKey)
  }

  getTagByAttr(json, tag, attr, attrVal) {
    let tagArr = this.getValue(json, tag)

    // tagArr[eachTag]['$'][attr]
    for (let eachTag in tagArr) {
      // if (this.getValue(tagArr[eachTag], attr).indexOf(attrVal) !== -1) {
      if (this.getValue(tagArr[eachTag], attr) === attrVal) {
        console.log(this.getValue(tagArr[eachTag], attr))
        return tagArr[eachTag]
        // return tagArr
      }
    }
    return null
  }

  getTag(json, tag) {
    let tagArr = this.getValue(json, tag)
    console.log(tagArr)
    // tagArr[eachTag]['$'][attr]
    for (let eachTag in tagArr) {
      if (typeof this.getValue(tagArr[eachTag]) !== 'undefined') {
        return tagArr[eachTag]
        // return tagArr
      }
    }
    return null
  }

  loadResult2Json(resultFilePath, callback) {
    var parser = new xml2js.Parser()
    let data = fs.readFileSync(resultFilePath)

    parser.parseString(data, (err, result) => {
      if (err) {
        console.log(err)
        return
      }
      else {
        // json = result
        callback(result)
      }
    })
  }

  createRootNode(resultFilePath) {
    if (fs.existsSync(resultFilePath)) return

    let xmlbuilder = require('xmlbuilder')
    let root = xmlbuilder.create('Parser', { encoding: 'UTF-8' }).dec('1.0', 'UTF-8')
      .att('version', '1.0')
      .att('Name', 'Parser')
      .att('Namespace', 'Susteen.Core.AppData')
      .att('Device', '')
      .att('icon', '')
      .ele('Application',
      {
        'AppearsInGroups': 'Messengers',
        'Caption': '',
        'name': path.basename(resultFilePath)
      }).end({ pretty: true })

    fs.writeFileSync(resultFilePath, root.toString())
  }

  // createApplicationNode(json, appName) {
  //   let appNode = {
  //     'Application': [{
  //       '$': {
  //         'AppearsInGroups': 'Messengers',
  //         'Caption': '',
  //         'name': appName
  //       }
  //     }]
  //   }
  //   json.push(appNode)
  // }

  createTagFilePath(dirPath, filePath) {
    let dir = path.basename(dirPath)
    let relativePath = filePath.substring(filePath.lastIndexOf(dir) + dir.length, filePath.length)
    let process = require('process')
    if (process.platform.match(/^win/))
      return '%container%' + relativePath.replace(/\\/g, '\\\\')
    return '%container%' + relativePath.replace(/\//g, '\\\\')
  }

  createResultFilePath(dirPath) {
    return path.join(path.dirname(dirPath), path.basename(dirPath) + '.xml')
  }

  createResult(resultFilePath, callback) {
    this.createRootNode(resultFilePath)
    this.loadResult2Json(resultFilePath, callback)
    // console.log(this.createResultFilePath)
  }

  getSelectedKeys(json, fileType, tagFilePath) {
    let tagNode = resultBuilder.getTagByAttr(json, fileType, 'File', tagFilePath)
    if (tagNode === null) return null

    let fields = this.getValue(tagNode, 'Field')
    let selectedKeys = []
    for (let field in fields) {
      selectedKeys.push(this.getValue(fields[field], '_'))
    }
    return selectedKeys
  }

  hasKey(tagNode, val) {
    let fields = tagNode['Field']
    for (let i in fields) {
      console.log(fields[i]['_'])
      if (fields[i]['_'] === val) return true
    }
    return false
  }

  isFieldExist(json, fileType, tagFilePath, fieldName) {
    let tag = resultBuilder.getTagByAttr(json, fileType, 'File', tagFilePath)
    if (tag === null) return false

    let fields = resultBuilder.getValue(tag, 'Field')
    if (fields === null) return false
    // if (fields.length === 1) return resultBuilder.getValue(fields, '_') === fieldName

    for (let field in fields) {
      if (resultBuilder.getValue(fields[field], '_') === fieldName) return true
    }
    return false
  }

  writeXml2File(json, resultFile) {
    let builder = new xml2js.Builder()
    let xml = builder.buildObject(json)
    fs.writeFileSync(resultFile, xml)
  }

  removeField(json, resultFile, fileType, tagFilePath, selectedFieldName) {
    let tagNode = this.getTagByAttr(json, fileType, 'File', tagFilePath)
    let fields = this.getValue(tagNode, 'Field')
    for (let field in fields) {
      if (this.getValue(fields[field], '_') === selectedFieldName) {
        console.log(fields[field])
        delete fields[field]
        this.writeXml2File(json, resultFile)
        return
      }
    }

  }

  addField(json, resultFile, fileType, tagFilePath, fieldRename, fieldName) {
    let tagNode = this.getTagByAttr(json, fileType, 'File', tagFilePath)
    if (tagNode === null) {
      // let applicationName = path.basename(dirPath)
      this.createXmlTagNode(json, tagFilePath)
    }

    if (!this.isFieldExist(json, fileType, tagFilePath, fieldName)) {
      let tag = this.getTagByAttr(json, fileType, 'File', tagFilePath)
      let fields = this.getValue(tag, 'Field')
      if (fields === null) {
        fields = this.createFieldTagNode(json, fileType, tagFilePath)
      }
      fields.push({
        '$': {
          'Name': fieldRename
        },
        '_': fieldName
      })

      this.writeXml2File(json, resultFile)
      // resultBuilder.writeResult2File(json, dirPath)
    } else {
      console.log('this field exists')
    }
  }

  createFieldTagNode(json, fileType, tagFilePath) {
    let xmlTagNode = this.getTagByAttr(json, fileType, 'File', tagFilePath)
    xmlTagNode['Field'] = []
    return xmlTagNode['Field']
  }

  adjustName(fileName) {
    return fileName
  }

  createAppName(tagFilePath) {
    let basename = tagFilePath.substring(tagFilePath.lastIndexOf('\\\\'), tagFilePath.length)
    let lastDotPos = 'ds'.lastIndexOf('.')
    let fileName = ''
    if (lastDotPos !== -1) {
      fileName = basename.substring(0, lastDotPos)
      return this.adjustName(fileName)
    }
    return ''
  }

  createXmlTagNode(json, tagFilePath) {
    let appTagNode = this.getTag(json, 'Application')
    let appName = this.createAppName(tagFilePath)
    appTagNode['XML'] = []
    let prop = {
      '$': {
        'Name': appName,
        'File': tagFilePath
      },
      '_': ''
    }
    appTagNode['XML'].push(prop)
  }

  /*writeResult2File(json, dirPath) {
    let builder = new xml2js.Builder()
    let xml = builder.buildObject(json)
    fs.writeFileSync(this.createResultFilePath(dirPath), xml)
  }*/
}
export let resultBuilder = new ResultBuilder()
