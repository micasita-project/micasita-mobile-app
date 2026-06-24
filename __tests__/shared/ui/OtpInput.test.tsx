import React, { useState } from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { OtpInput } from '@/shared/ui/OtpInput';

/**
 * Controlled harness: OtpInput is controlled, so a wrapper holds real state.
 * This lets us assert how the value is distributed across the boxes after typing/pasting.
 */
function Harness({
  length = 6,
  onComplete,
}: {
  length?: number;
  onComplete?: (v: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <OtpInput
      length={length}
      value={value}
      onChange={setValue}
      onComplete={onComplete}
      autoFocus={false}
    />
  );
}

// RNTL 14 + React 19: `render` is async, and state updates must be flushed inside act().
async function setup(props?: { length?: number; onComplete?: (v: string) => void }) {
  const utils = await render(<Harness {...props} />);
  const boxes = () => utils.getAllByTestId('otp-box');
  const values = () => boxes().map((b) => b.props.value);
  return { ...utils, boxes, values };
}

// Type/paste into box `i` (the whole string lands in one box's onChangeText, as a real paste does).
async function change(boxes: () => any[], i: number, text: string) {
  await act(async () => {
    fireEvent.changeText(boxes()[i], text);
  });
}

// Simulate a physical Backspace key on box `i`.
async function backspace(boxes: () => any[], i: number) {
  await act(async () => {
    fireEvent(boxes()[i], 'keyPress', { nativeEvent: { key: 'Backspace' } });
  });
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('OtpInput rendering', () => {
  it('renders `length` separate boxes (default 6)', async () => {
    const { boxes } = await setup();
    expect(boxes()).toHaveLength(6);
  });

  it('renders a custom number of boxes', async () => {
    const { boxes } = await setup({ length: 4 });
    expect(boxes()).toHaveLength(4);
  });

  it('starts with all boxes empty', async () => {
    const { values } = await setup();
    expect(values()).toEqual(['', '', '', '', '', '']);
  });

  it('each box accepts only the number-pad keyboard', async () => {
    const { boxes } = await setup();
    boxes().forEach((box) => expect(box.props.keyboardType).toBe('number-pad'));
  });
});

// ── Sequential typing (auto-advance) ──────────────────────────────────────────

describe('OtpInput sequential typing', () => {
  it('places each typed digit in its own box', async () => {
    const { boxes, values } = await setup();

    await change(boxes, 0, '1');
    await change(boxes, 1, '2');
    await change(boxes, 2, '3');

    expect(values()).toEqual(['1', '2', '3', '', '', '']);
  });

  it('ignores non-numeric characters', async () => {
    const { boxes, values } = await setup();

    await change(boxes, 0, 'a');

    expect(values()).toEqual(['', '', '', '', '', '']);
  });

  it('calls onComplete when the last digit fills the final box', async () => {
    const onComplete = jest.fn();
    const { boxes } = await setup({ length: 4, onComplete });

    await change(boxes, 0, '1');
    await change(boxes, 1, '2');
    await change(boxes, 2, '3');
    await change(boxes, 3, '4');

    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('does not call onComplete before all boxes are filled', async () => {
    const onComplete = jest.fn();
    const { boxes } = await setup({ length: 4, onComplete });

    await change(boxes, 0, '1');
    await change(boxes, 1, '2');

    expect(onComplete).not.toHaveBeenCalled();
  });
});

// ── Paste (distribute full code) ──────────────────────────────────────────────

describe('OtpInput paste', () => {
  it('distributes a full pasted code across all boxes', async () => {
    const { boxes, values } = await setup();

    // Pasting delivers the whole string to the first box's onChangeText
    await change(boxes, 0, '123456');

    expect(values()).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('calls onComplete after a full paste', async () => {
    const onComplete = jest.fn();
    const { boxes } = await setup({ onComplete });

    await change(boxes, 0, '123456');

    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('strips non-digits and separators when pasting', async () => {
    const { boxes, values } = await setup();

    await change(boxes, 0, '12-34 56');

    expect(values()).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('truncates a paste longer than the box count', async () => {
    const onComplete = jest.fn();
    const { boxes, values } = await setup({ onComplete });

    await change(boxes, 0, '12345678');

    expect(onComplete).toHaveBeenCalledWith('123456');
    expect(values()).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('fills only the first boxes on a partial paste without completing', async () => {
    const onComplete = jest.fn();
    const { boxes, values } = await setup({ onComplete });

    await change(boxes, 0, '123');

    expect(values()).toEqual(['1', '2', '3', '', '', '']);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

// ── Backspace / deletion ──────────────────────────────────────────────────────

describe('OtpInput deletion', () => {
  it('removes the last digit when backspace is pressed on the empty active box', async () => {
    const { boxes, values } = await setup();

    await change(boxes, 0, '1');
    await change(boxes, 1, '2');

    // Backspace on the first empty box (index 2) removes the previous digit
    await backspace(boxes, 2);

    expect(values()).toEqual(['1', '', '', '', '', '']);
  });

  it('clears a box when its content is deleted', async () => {
    const { boxes, values } = await setup();

    await change(boxes, 0, '1');
    await change(boxes, 1, '2');

    // Delete content of box 1
    await change(boxes, 1, '');

    expect(values()).toEqual(['1', '', '', '', '', '']);
  });

  it('does nothing when backspacing with an empty code', async () => {
    const { boxes, values } = await setup();

    await backspace(boxes, 0);

    expect(values()).toEqual(['', '', '', '', '', '']);
  });
});
