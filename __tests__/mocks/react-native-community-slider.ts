/**
 * Mock for @react-native-community/slider
 */

import React from 'react'

const Slider = React.forwardRef((props: any, ref: any) =>
  React.createElement('input', {
    type: 'range',
    ref,
    'data-testid': props.testID,
    value: props.value,
    min: props.minimumValue,
    max: props.maximumValue,
    step: props.step,
    onChange: (e: any) => props.onValueChange?.(Number(e.target.value)),
  })
)

Slider.displayName = 'Slider'

export default Slider
