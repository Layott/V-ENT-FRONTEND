import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const SlideTransition = (props) => {
  return <Slide {...props} direction="down" />;
};

const MessageSnackbar = ({ open, handleClose, message, type }) => {
  return (
    <Snackbar
    open={open}
    autoHideDuration={3000}
    onClose={handleClose}
    TransitionComponent={SlideTransition}
    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    sx={{
      mt: { xs: -2 , sm: -3 }
    }}
    >
      <Alert 
        onClose={handleClose}
        severity={type}
        sx={{
          backgroundColor: type === 'success' ? 'green' : 'red',
          color: 'white',
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default MessageSnackbar;
