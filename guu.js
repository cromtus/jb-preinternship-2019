var util = {
  lastElement: function(array) {
    return array[array.length - 1]
  },
  emptyStringFilter: function(str) {
    return str.trim() != ''
  },
  MAX_CALLSTACK_SIZE: 100
}

function Procedure(name, entry_pointer) {
  this.name = name
  this.entry_pointer = entry_pointer
}

function StackFrame(procedure, instruction_pointer) {
  this.procedure = procedure
  this.instruction_pointer = instruction_pointer
}

function Instruction(type, params) {
  this.type = type
  this.params = params || {}
}

function Context() {
  this.callstack = []
  this.current_stack_frame = null
  this.pushStackFrame = function(procedure) {
    this.current_stack_frame = new StackFrame(procedure, procedure.entry_pointer)
    this.callstack.push(this.current_stack_frame)
  }
  this.popStackFrame = function() {
    this.callstack.pop()
    this.current_stack_frame = util.lastElement(this.callstack)
  }
  this.getInstructionPointer = function() {
    return current_stack_frame.instruction_pointer
  }
  
}

function ExecutionMessage(type, text, must_terminate) {
  this.type = type
  this.text = text
  this.must_terminate = must_terminate
}

function Interpreter(source_code, output) {
  var self = this
  
  this.terminated = false
  this.started = false
  this.output = output || console.log
  
  this.start = function() {
    this.started = true
    this.global_variables = {}
    var result = this.__makeInitialContext()
    if (result.type && result.type == 'error') {
      if (result.must_terminate) this.terminated = true
      return result
    }
    this.current_context = result
  }
  
  this.step = function() {
    if (this.terminated) return
    var ip = this.current_context.current_stack_frame.instruction_pointer
    var current_instruction = this.instructions[ip]
    var message = this.__executors[current_instruction.type](current_instruction.params)
    if (message && message.must_terminate) {
      this.terminated = true
    }
    return message
  }
  
  this.__nextInstruction = function() {
    var ip = this.current_context.current_stack_frame.instruction_pointer + 1
    if (this.instructions.length <= ip || this.instructions[ip].type == 'sub') {
      if (this.current_context.callstack.length == 1) {
        return new ExecutionMessage('info', 'Program successfully completed', true)
      } else {
        this.current_context.popStackFrame()
        return this.__nextInstruction()
      }
    } else {
      this.current_context.current_stack_frame.instruction_pointer = ip
    }
  }
  
  this.__executors = {
    'sub': function(params) {
      return self.__nextInstruction()
    },
    'set': function(params) {
      self.global_variables[params.variable] = params.value
      return self.__nextInstruction()
    },
    'call': function(params) {
      var name = params.name
      if (!self.procedures[name]) {
        return new ExecutionMessage('error', 'No procesure named ' + name, true)
      }
      if (self.current_context.callstack.length == util.MAX_CALLSTACK_SIZE) {
        return new ExecutionMessage('error', 'Stack overflow :(', true)
      }
      self.current_context.pushStackFrame(self.procedures[name])
    },
    'print': function(params) {
      self.output(self.global_variables[params.variable])
      return self.__nextInstruction()
    },
    'empty': function() {
      return self.__nextInstruction()
    },
    'invalid': function(params) {
      return new ExecutionMessage('error', params.why, true)
    }
  }
  
  this.__main_procedure = 'main'
  
  this.__init = function() {	      
    // reading source
    var lines = source_code.split('\n')
    this.source_code = lines
    this.instructions = []
    this.procedures = {}
    for (var i = 0; i < lines.length; i++) {
      var instruction = this.__parseInstruction(lines[i])
      if (instruction.type == 'sub') {
        var procedure = new Procedure(instruction.params.name, i)
        this.procedures[procedure.name] = procedure
      }
      this.instructions.push(instruction)
    }
  }
  
  this.__sourceToInstructions = function(source) {
    return source_code.split('\n').filter(util.emptyStringFilter)
  }
  
  this.__makeInitialContext = function() {
    if (!this.procedures[this.__main_procedure]) {
      return new ExecutionMessage('error', 'No "' + this.__main_procedure + '" function', true)
    }
    var context = new Context()
    context.pushStackFrame(this.procedures[this.__main_procedure])
    return context
  }
  
  this.__parseInstruction = function(line) {
    var tokens = line.trim().split(' ').filter(util.emptyStringFilter)
    if (tokens.length == 0) {
      return new Instruction('empty')
    }
    switch (tokens[0]) {
    case 'sub':
      if (tokens.length != 2) {
        return new Instruction('invalid', {
          why: '"sub" takes exactly one argument: function name'
        })
      }
      return new Instruction('sub', {name: tokens[1]})
    case 'set':
      if (tokens.length != 3) {
        return new Instruction('invalid', {
          why: '"set" takes exactly two arguments: variable and value to assign'
        })
      }
      return new Instruction('set', {variable: tokens[1], value: tokens[2]})
    case 'call':
      if (tokens.length != 2) {
        return new Instruction('invalid', {
          why: '"call" takes exactly one argument: function to call'
        })
      }
      return new Instruction('call', {name: tokens[1]})
    case 'print':
      if (tokens.length != 2) {
        return new Instruction('invalid', {
          why: '"print" takes exactly one argument: variable'
        })
      }
      return new Instruction('print', {variable: tokens[1]})
    default:
      return new Instruction('invalid', {
        why: 'Unknown command ' + tokens[0]
      })
    }
  }
  
  this.__init()
}