import { Action, State, StateTransition } from './types.ts';

const stateTransition: StateTransition = {
    [State.IDLE]: {
        [Action.START]: State.LOBBY,
    },
    [State.LOBBY]: {
        [Action.JOIN_LOBBY]: State.LOBBY,
        [Action.CREATE_ROUND]: State.ROUND_START,
    },
    [State.ROUND_START]: {
        [Action.START_ROUND]: State.PLAYING,
    },
    [State.PLAYING]: {
        [Action.PAUSE_ROUND]: State.PAUSE,
        [Action.END_ROUND]: State.ROUND_END,
    },
    [State.PAUSE]: {
        [Action.START_ROUND]: State.PLAYING,
        [Action.END_ROUND]: State.ROUND_END,
    },
    [State.ROUND_END]: {
        [Action.START]: State.LOBBY,
    },
};

class StateMachine {
    private _state: State = State.IDLE;

    public get state() {
        return this._state;
    }

    public transition(action: Action) {
        const nextState = stateTransition[this._state][action];
        if (nextState) {
            this._state = nextState;
        } else {
            throw new StateTransitionError(`Invalid action ${action} from state ${this._state}`);
        }
    }
}

class StateTransitionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "StateTransitionError";
    }
}

export {
    StateMachine,
    StateTransitionError,
}