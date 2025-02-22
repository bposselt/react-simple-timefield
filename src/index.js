import React from 'react';
import PropTypes from 'prop-types';

const DEFAULT_COLON = ':';
const DEFAULT_FRACTION = '.';
const DEFAULT_VALUE_SHORT = `00${DEFAULT_COLON}00`;
const DEFAULT_VALUE_FULL = `00${DEFAULT_COLON}00${DEFAULT_COLON}00`;
const DEFAULT_VALUE_MS = `00${DEFAULT_COLON}00${DEFAULT_COLON}00${DEFAULT_FRACTION}000`;

export function isNumber(value) {
  const number = Number(value);
  return !isNaN(number) && String(value) === String(number);
}

export function formatTimeItem(value, ms) {
  if (ms) {
    return `${value || ''}000`.substr(0, 3);
  }
  return `${value || ''}00`.substr(0, 2);
}

export function validateTimeAndCursor(
  showSeconds = false,
  showMs = false,
  value = '',
  defaultValue = '',
  colon = DEFAULT_COLON,
  fraction = DEFAULT_FRACTION,
  cursorPosition = 0
) {
  let [oldH, oldM, oldS, oldMs] = defaultValue.split(colon);
  if (showMs && oldS && ~oldS.indexOf(fraction)) {
    [oldMs] = oldS.split(fraction);
    oldS = oldMs[0];
    oldMs = oldMs[1];
  }

  let newCursorPosition = Number(cursorPosition);
  let [newH, newM, newS, newMs] = String(value).split(colon);
  if (showMs && newS && ~newS.indexOf(fraction)) {
    const fractions = newS.split(fraction);
    newS = fractions[0];
    newMs = fractions[1];
  }

  newH = formatTimeItem(newH);
  if (Number(newH[0]) > 2) {
    newH = oldH;
    newCursorPosition -= 1;
  } else if (Number(newH[0]) === 2) {
    if (Number(oldH[0]) === 2 && Number(newH[1]) > 3) {
      newH = `2${oldH[1]}`;
      newCursorPosition -= 2;
    } else if (Number(newH[1]) > 3) {
      newH = '23';
    }
  }

  newM = formatTimeItem(newM);
  if (Number(newM[0]) > 5) {
    newM = oldM;
    newCursorPosition -= 1;
  }

  if (showSeconds) {
    newS = formatTimeItem(newS);
    if (Number(newS[0]) > 5) {
      newS = oldS;
      newCursorPosition -= 1;
    }
  }

  if (showMs) {
    newS = formatTimeItem(newS);
    if (Number(newS[0]) > 5) {
      newS = oldS;
      newCursorPosition -= 1;
    }
    newMs = formatTimeItem(newMs, true);
  }

  const validatedValue = showSeconds
    ? `${newH}${colon}${newM}${colon}${newS}`
    : showMs
    ? `${newH}${colon}${newM}${colon}${newS}${fraction}${newMs}`
    : `${newH}${colon}${newM}`;

  return [validatedValue, newCursorPosition];
}

export default class TimeField extends React.Component {
  static propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    showSeconds: PropTypes.bool,
    showMs: PropTypes.bool,
    input: PropTypes.element,
    colon: PropTypes.string,
    style: PropTypes.object
  };

  static defaultProps = {
    showSeconds: false,
    showMs: false,
    input: null,
    style: {},
    colon: DEFAULT_COLON,
    fraction: DEFAULT_FRACTION
  };

  constructor(props, ...args) {
    super(props, ...args);

    this.configure(props);

    const [validatedTime] = validateTimeAndCursor(
      this._showSeconds,
      this._showMs,
      this.props.value,
      this._defaultValue,
      this._colon,
      this._fraction
    );

    this.state = {
      value: validatedTime
    };

    this.onInputChange = this.onInputChange.bind(this);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const {value} = this.props;

    this.configure(nextProps);

    if (value !== nextProps.value) {
      const [validatedTime] = validateTimeAndCursor(
        this._showSeconds,
        this._showMs,
        nextProps.value,
        this._defaultValue,
        this._colon,
        this._fraction
      );
      this.setState({
        value: validatedTime
      });
    }
  }

  configure(props) {
    this._colon = props.colon && props.colon.length === 1 ? props.colon : DEFAULT_COLON;
    this._fraction = props.fraction && props.fraction.length === 1 ? props.fraction : DEFAULT_FRACTION;
    this._showSeconds = Boolean(props.showSeconds);
    this._showMs = Boolean(props.showMs);
    this._defaultValue = this._showSeconds ? DEFAULT_VALUE_FULL : this._showMs ? DEFAULT_VALUE_MS : DEFAULT_VALUE_SHORT;
    this._maxLength = this._defaultValue.length;
  }

  onInputChange(event, callback) {
    const oldValue = this.state.value;
    const inputEl = event.target;
    const inputValue = inputEl.value;
    const position = inputEl.selectionEnd;
    const isTyped = inputValue.length > oldValue.length;
    const cursorCharacter = inputValue[position - 1];
    const addedCharacter = isTyped ? cursorCharacter : null;
    const removedCharacter = isTyped ? null : oldValue[position];
    const replacedSingleCharacter = inputValue.length === oldValue.length ? oldValue[position - 1] : null;
    const colon = this._colon;
    const fraction = this._fraction;

    let newValue = oldValue;
    let newPosition = position;

    if (addedCharacter !== null) {
      if (position > this._maxLength) {
        newPosition = this._maxLength;
      } else if (
        (position === 3 || position === 6 || position === 9) &&
        (addedCharacter === colon || addedCharacter === fraction)
      ) {
        const useColonOrFraction = position === 9 ? fraction : colon;
        newValue = `${inputValue.substr(0, position - 1)}${useColonOrFraction}${inputValue.substr(position + 1)}`;
      } else if ((position === 3 || position === 6 || position === 9) && isNumber(addedCharacter)) {
        const useColonOrFraction = position === 9 ? fraction : colon;
        newValue = `${inputValue.substr(0, position - 1)}${useColonOrFraction}${addedCharacter}${inputValue.substr(
          position + 2
        )}`;
        newPosition = position + 1;
      } else if (isNumber(addedCharacter)) {
        // user typed a number
        newValue = inputValue.substr(0, position - 1) + addedCharacter + inputValue.substr(position + 1);
        if (position === 2 || position === 5 || position === 8) {
          newPosition = position + 1;
        }
      } else {
        // if user typed NOT a number, then keep old value & position
        newPosition = position - 1;
      }
    } else if (replacedSingleCharacter !== null) {
      // user replaced only a single character
      if (isNumber(cursorCharacter)) {
        if (position - 1 === 2 || position - 1 === 5 || position - 1 === 8) {
          const useColonOrFraction = position === 8 ? fraction : colon;
          newValue = `${inputValue.substr(0, position - 1)}${useColonOrFraction}${inputValue.substr(position)}`;
        } else {
          newValue = inputValue;
        }
      } else {
        // user replaced a number on some non-number character
        newValue = oldValue;
        newPosition = position - 1;
      }
    } else if (
      typeof cursorCharacter !== 'undefined' &&
      cursorCharacter !== colon &&
      cursorCharacter !== fraction &&
      !isNumber(cursorCharacter)
    ) {
      // set of characters replaced by non-number
      newValue = oldValue;
      newPosition = position - 1;
    } else if (removedCharacter !== null) {
      if (
        (position === 2 || position === 5 || position === 8) &&
        (removedCharacter === colon || removedCharacter === fraction)
      ) {
        newValue = `${inputValue.substr(0, position - 1)}0${removedCharacter}${inputValue.substr(position)}`;
        newPosition = position - 1;
      } else {
        // user removed a number
        newValue = `${inputValue.substr(0, position)}0${inputValue.substr(position)}`;
      }
    }

    const [validatedTime, validatedCursorPosition] = validateTimeAndCursor(
      this._showSeconds,
      this._showMs,
      newValue,
      oldValue,
      colon,
      fraction,
      newPosition
    );

    this.setState({value: validatedTime}, () => {
      inputEl.selectionStart = validatedCursorPosition;
      inputEl.selectionEnd = validatedCursorPosition;
      callback(validatedTime);
    });

    event.persist();
  }

  render() {
    const {value} = this.state;
    const {onChange, style, showSeconds, showMs, input, colon, ...props} = this.props; //eslint-disable-line no-unused-vars
    const onChangeHandler = (event) => this.onInputChange(event, (v) => onChange && onChange(v));

    if (input) {
      return React.cloneElement(input, {
        ...props,
        value,
        style,
        onChange: onChangeHandler
      });
    }

    return (
      <input
        type="text"
        {...props}
        value={value}
        onChange={onChangeHandler}
        style={{width: showSeconds ? 54 : showMs ? 90 : 35, ...style}}
      />
    );
  }
}
