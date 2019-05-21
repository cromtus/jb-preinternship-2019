var inputNode = document.getElementById('input'),
    editorNode = document.getElementById('editor'),
    debuggerNode = document.getElementById('debugger'),
    linesNode = document.getElementById('lines'),
    outputNode = document.getElementById('output')

var interpreter

function hide(el) {
  el.style.display = 'none'
}

function show(el) {
  el.style.display = 'block'
}

function newLine(line, index) {
  var node = document.createElement('div')
  node.className = 'line'
  index = ' '.repeat(6 - (index + '').length) + index
  node.innerHTML = '<span class="number">' + index + '</span>' + line
  return node
}

function clearOutput() {
  var messages = document.getElementsByClassName('message')
  while (messages.length) {
    remove(messages[0])
  }
}

function clearDebugger() {
  linesNode.innerHTML = ''
  clearOutput()
}

function __changeDebuggerButtonsState(enabled) {
  var buttons = document.getElementsByClassName('disablable')
  for (var i in buttons) {
    buttons[i].disabled = !enabled
  }
}

function disableDebuggerButtons() {
  __changeDebuggerButtonsState(false)
}

function enableDebuggerButtons() {
  __changeDebuggerButtonsState(true)
}

function remove(el) {
  el.parentNode.removeChild(el)
}

function addMessage(type, str) {
  var close = document.createElement('span')
  close.innerHTML = '&#10005;'
  close.className = 'close'
  close.onclick = function() {
    remove(this.parentNode)
  }
  
  var text = document.createElement('div')
  text.innerHTML = str
  text.className = 'text'
  
  var node = document.createElement('div')
  node.className = type + ' message'
  node.appendChild(close)
  node.appendChild(text)
  
  outputNode.appendChild(node)
}

function output(str) {
  addMessage('output', str)
}

function start() {
  interpreter = new Interpreter(inputNode.value, output)
  for (var i in interpreter.source_code) {
    linesNode.appendChild(newLine(interpreter.source_code[i], i))
  }
  hide(editorNode)
  show(debuggerNode)
  step()
}

function __step() {
  var message = interpreter.started ? interpreter.step() : interpreter.start()
  handleMessage(message)
}

function __stepPrologue() {
  disableDebuggerButtons()
}

function __stepEpilogue() {
  actualInstructionPointer()
  if (!interpreter.terminated) {
    enableDebuggerButtons()
  }
}

function step() {
  __stepPrologue()
  __step()
  __stepEpilogue()
}

function stepOver() {
  __stepPrologue()
  var initial_stack_depth = interpreter.current_context.callstack.length
  do {
    __step()
  } while (!interpreter.terminated && interpreter.current_context.callstack.length > initial_stack_depth)
  __stepEpilogue()
}

function handleMessage(message) {
  if (!message) return
  addMessage(message.type, message.text)
}

function reset() {
  clearDebugger()
  hide(debuggerNode)
  show(editorNode)
  inputNode.focus()
}

function getCurrentLine(index) {
  return document.getElementsByClassName('line')[interpreter.current_context.current_stack_frame.instruction_pointer]
}

function actualInstructionPointer() {
  var prev = document.getElementsByClassName('highlighted')[0]
  if (prev) prev.className = 'line'
  if (!interpreter.terminated) {
    getCurrentLine().className = 'line highlighted'
  } else {
    if (prev) getCurrentLine().className = 'line highdarked'
  }
}

function displayStackTrace() {
  var text = ''
  var callstack = interpreter.current_context.callstack
  for (var i in callstack) {
    if (i != 0) text += ' &rarr; '
    var stack_frame = callstack[i]
    var location = stack_frame.procedure.name + ':' + stack_frame.instruction_pointer
    if (i == callstack.length - 1) {
      text += '<b>' + location + '</b>'
    } else {
      text += location
    }
  }
  addMessage('info', text)
}

function displayVariables() {
  var text = ''
  var variables = interpreter.global_variables
  for (var i in variables) {
    text += i += ' = "' + variables[i] + '"<br>'
  }
  addMessage('info', text)
}

function test(index) {
  var tests = [
    'sub main\n  set a 1\n  call foo\n  print a\nsub foo\n  set a 2',
    
    'sub main\n  call foo\nsub foo\n  call main',
    
    'sub a\n  set ____ a\n  print ____\nsub b\n  set ---- b\n  print ----\nsub 5\n  call b\nsub 4\n  call 5\nsub 3\n  call a\n  call 4\n  call a\nsub 2\n  call 3\nsub 1\n  call 2\nsub main\n  call 1',
    
    'sub a\nsub b\nsub c\nsub main\n  call a\n  call b\n  call x\n  call z\nsub x\nsub y\nsub z',
    
    '\n\n\n\n    sub     yekaterinburg\n      set       x     saratov\n\n call     sochi\n\n\n        sub                sochi\n   \n        \n  set         y      moscow\n                                       \n               sub main\ncall yekaterinburg\n\n',
    
    'sub main\n  set a :))))\n  call correct\n  call incorrect\n  call correct\nsub correct\n  set a :)\n  print a\nsub incorrect\n  set a :( :('
  ]
  inputNode.value = tests[index]
  return false
}