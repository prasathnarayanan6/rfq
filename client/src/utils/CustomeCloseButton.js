import React from 'react'

function CustomCloseButton({closeToast}) {
  return (
    <div style={{ flex: 1, textAlign: 'right', marginRight: '10px' }}>
    <button
      onClick={closeToast}
      style={{
        background: 'none',
        border: 'none',
        color: 'white',
        fontWeight: 'semibold',
        cursor: 'pointer'
      }}
    >
      Close
    </button>
  </div>
  )
}
export default CustomCloseButton;