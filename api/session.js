export const validateSessionHandler = async (req, res) => {
  return res.status(200).json({
    message: 'Session dinonaktifkan',
    sessionEnabled: false,
  });
};

export const logoutHandler = async (req, res) => {
  return res.status(200).json({
    message: 'Session dinonaktifkan',
    sessionEnabled: false,
  });
};
