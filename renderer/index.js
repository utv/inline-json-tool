'use strict'
const { dialog } = require('electron').remote
const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
// const { parseString } = require('xml2js')

let outputFile = path.resolve('./output.xml')
let fileChooser = document.getElementsByClassName('file-chooser')[0]
let navigatorRow = document.getElementsByClassName('navigate')[0]
let fileNameLink = document.getElementsByClassName('file-name-link')[0]
let content = document.getElementById('content')

function clearCheckboxes() {
  let checkboxes = content.querySelectorAll('input[type=checkbox')
  // remove checkbox listener
  if (checkboxes.length > 0) {
    for (let i = 0; i < checkboxes.length; i++) {
      console.log(checkboxes.item(i))
      console.log(typeof checkboxes.item(i))
      checkboxes.item(i).removeEventListener('click', checkboxListener)
    }
  }
}

function clearFileNameLink() {
  if (fileNameLink.innerHTML !== '') {
    fileNameLink.removeEventListener('click', fileNameLinkListener)
  }
}

function clearContent() {
  // remove html elements
  while (content.firstChild) {
    content.removeChild(content.firstChild)
  }
}

function clear() {
  clearCheckboxes()
  clearFileNameLink()
  clearContent()
  // remove link listener
}

function getValue(json, theKey) {
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

function updateOutputFile(json) {
  let builder = new xml2js.Builder()
  let xml = builder.buildObject(json)
  fs.writeFileSync(outputFile, xml)
}

function addRootNode(rename, key) {
  let root = {
    'root': {
      'Field': {
        '$': {
          InlineJSON: key,
          'Name': rename
        },
        '_': key
      }
    }
  }
  updateOutputFile(root)
}

function addField(rename, key, inlinejson) {
  let output = fs.readFileSync(outputFile)
  xml2js.parseString(output, (err, json) => {
    if (err) {
      console.log(err)
      return
    }

    if (json === null) {
      addRootNode(rename, key)
      console.log(json)
    } else {
      let fields = getValue(json, 'Field')
      console.log(fields)
      fields.push({
        '$': {
          InlineJSON: inlinejson,
          Name: rename
        },
        '_': 'KEY'
      })
      updateOutputFile(json)
    }
  })
}

function removeField(inlinejson) {
  let output = fs.readFileSync(outputFile)
  xml2js.parseString(output, (err, json) => {
    if (err) {
      console.log(err)
      return
    }

    let fields = getValue(json, 'Field')
    if (fields.length === 1) {
      fs.writeFileSync(outputFile, '')
      return
    }

    for (let field in fields) {
      if (getValue(fields[field], 'InlineJSON') === inlinejson) {
        delete fields[field]
        updateOutputFile(json)
        return
      }
    }
  })
}

function checkboxListener(event) {
  if (!event.target.checked) {
    let inlinejson = event.target.parentNode.parentNode.inlinejson
    removeField(inlinejson)
    event.target.checked = false
    event.target.parentNode.parentNode.classList.remove('selected-row')
    return
  }

  let row = event.target.parentNode.parentNode
  let rename = row.children[1].innerHTML
  let key = row.children[2].innerHTML
  let inlinejson = row.inlinejson
  addField(rename, key, inlinejson)
  event.target.parentNode.parentNode.classList.add('selected-row')
}

function linkListener(event) {
  event.preventDefault()
  clearCheckboxes()
  clearContent()
  display(event.target.data)
  highlight()
  // let link = document.createElement('a')
  // link.innerHTML = event.target.sourceName
  // navigatorRow.appendChild(link)
}

function fileNameLinkListener(event) {
  event.preventDefault()

  clearCheckboxes()
  clearContent()
  console.log(fileNameLink.data)
  display(fileNameLink.data)
  highlight()
}

function path2Key(key) {
  function traverse(obj, theKey, pathToKey) {
    if (obj === '') return

    if (obj[theKey] === undefined) {
      for (let i in obj) {
        if (obj.hasOwnProperty(i) && typeof obj[i] === 'object') {
          let result = traverse(obj[i], theKey, i + '/' + theKey)
          if (result !== null)
            return result
        }
      }
      return null
    } else {
      return pathToKey
    }
  }

  return traverse(fileNameLink.data, key, key)
}

function display(data) {
  for (let node in data) {
    // display in format: [rename, key, value]
    // rename = key by default

    let row = document.createElement('tr')
    let chooseTd = document.createElement('td')
    let renameTd = document.createElement('td')
    let keyTd = document.createElement('td')
    let valTd = document.createElement('td')
    renameTd.innerHTML = node
    keyTd.innerHTML = node

    if (typeof data[node] === 'object') {
      let link = document.createElement('a')
      link.innerHTML = 'explore'
      // link.source = outputFile
      // link.sourceName = path.basename(outputFile)
      link.key = node
      link.data = data[node]
      link.addEventListener('click', linkListener)
      chooseTd.appendChild(link)
      valTd.innerHTML = ''
    } else {

      let checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.value = node
      checkbox.addEventListener('click', checkboxListener)
      chooseTd.appendChild(checkbox)
      valTd.innerHTML = data[node]
    }
    console.log(path2Key(node))
    row.inlinejson = path2Key(node)
    row.appendChild(chooseTd)
    row.appendChild(renameTd)
    row.appendChild(keyTd)
    row.appendChild(valTd)

    document.getElementById('content').appendChild(row)
  }
}

function highlight() {
  let outputData = fs.readFileSync(outputFile)
  if (outputData.toString() === '') return

  xml2js.parseString(outputData, (err, json) => {
    let selected = getValue(json, 'Field')
    if (selected === null) return
    let selectedKeys = []
    let parentKeys = []
    for (let node in selected) {
      selectedKeys.push(getValue(selected[node], 'InlineJSON'))

    }
    console.log(selectedKeys)

    if (content.childElementCount > 0) {
      let rows = content.querySelectorAll('tr')
      for (let i = 0; i < rows.length; i++) {
        // let key = rows.item(i).getElementsByTagName('td')[2].innerHTML
        let key = rows.item(i).inlinejson
        for (let selectedKey in selectedKeys) {
          let checkbox = rows.item(i).getElementsByTagName('input')[0]
          if (checkbox === undefined) {
            let pathSelectedKey = selectedKeys[selectedKey].substring(0, selectedKeys[selectedKey].lastIndexOf('/'))
            if (key.indexOf('/') > -1 && key === pathSelectedKey) {
              rows.item(i).classList.add('selected-row')
              break
            } else if (key === pathSelectedKey) {
              rows.item(i).classList.add('selected-row')
              break
            }
          }
          else if (selectedKeys[selectedKey] === key) {
            rows.item(i).classList.add('selected-row')
            checkbox.checked = true
            break
          }
        }

        // if (selectedKeys.indexOf(key) !== -1) {
        //   rows.item(i).classList.add('selected-row')
        //   let checkbox = rows.item(i).getElementsByTagName('input')[0]
        //   checkbox.checked = true
        // }
      }
    }
  })

}

fileChooser.addEventListener('click', (event) => {
  dialog.showOpenDialog({ properties: ['openFile'] }, (fileNames) => {
    if (fileNames === undefined) return
    clear()

    fs.writeFileSync(outputFile, '')
    let data = fs.readFileSync(fileNames[0])
    data = JSON.parse(data.toString())
    fileNameLink.innerHTML = path.basename(outputFile)
    // fileNameLink.pathname = outputFile
    fileNameLink.data = data
    display(data)
    highlight()
  })
})

fileNameLink.addEventListener('click', fileNameLinkListener)

