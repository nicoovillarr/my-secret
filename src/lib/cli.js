import { createInterface } from 'readline'

export const print = console.log

export function prompt(msg, regex = /^[a-zA-Z0-9_-]*$/) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    })
    const ask = () => {
      rl.question(msg, (input) => {
        if (regex == null || regex.test(input)) {
          rl.close()
          resolve(input)
        } else {
          console.error('Invalid input')
          ask()
        }
      })
    }

    ask()
  })
}

export function promptString(msg, required = true) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    })
    const ask = () => {
      rl.question(msg, (input) => {
        if (input.trim() === '' && required === true) {
          ask()
          return
        } else {
          rl.close()
          resolve(input)
        }
      })
    }
    ask()
  })
}

export function promptNumber(msg) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    })
    const ask = () => {
      rl.question(msg, (input) => {
        const number = parseFloat(input)
        if (!isNaN(number)) {
          rl.close()
          resolve(number)
        } else {
          ask()
        }
      })
    }
    ask()
  })
}

export function promptBoolean(msg, defaultValue = null) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    })
    const ask = () => {
      rl.question(msg, (input) => {
        const truelish = ['y', 'yes', 'true', '1']
        const falsish = ['n', 'no', 'false', '0']
        if (input === '' && defaultValue !== null) {
          rl.close()
          resolve(defaultValue)
        } else if (truelish.includes(input)) {
          rl.close()
          resolve(true)
        } else if (falsish.includes(input)) {
          rl.close()
          resolve(false)
        } else {
          ask()
        }
      })
    }
    ask()
  })
}
