const getHealthStatus = (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'Backend is healthy and reachable.',
  });
};

module.exports = {
  getHealthStatus,
};
