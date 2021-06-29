import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { createMachine, interpret, assign } from 'xstate';

function fakeServerResponse(context) {
  return new Promise((resolve, reject) => {
    later(() => {
      if (context.username && context.password) {
        resolve('Valid!');
      } else {
        reject('Invalid!');
      }
    }, 1000);
  });
}

let signupFormMachine = createMachine({
  id: 'signup-form',
  initial: 'idle',
  context: {
    username: '',
    password: '',
  },
  states: {
    idle: {
      on: {
        SUBMIT: {
          target: 'saving',
          actions: [
            assign({
              username: (context, event) => event.username,
              password: (context, event) => event.password,
            }),
          ],
        },
      },
    },
    saving: {
      invoke: {
        id: 'fakeServerResponse',
        src: fakeServerResponse,
        onDone: {
          target: 'success',
        },
        onError: {
          target: 'error',
        },
      },
    },
    success: {
      type: 'final',
    },
    error: {
      on: {
        RETRY: 'idle',
      },
    },
  },
});

export default class SignupFormComponent extends Component {
  @tracked state;
  @tracked username;
  @tracked password;

  constructor() {
    super(...arguments);
    this.machine = interpret(signupFormMachine);
    this.machine.start();
    this.machine.onTransition((state) => {
      this.state = state.value;
    });
  }

  @action
  send(eventName, e) {
    e.preventDefault();
    this.machine.send(eventName);
  }

  @action
  submit(e) {
    e.preventDefault();
    this.machine.send({
      type: 'SUBMIT',
      username: this.username,
      password: this.password,
    });
  }
}
