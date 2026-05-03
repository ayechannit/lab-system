const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      const err = new Error(errorMessage);
      err.statusCode = 400;
      return next(err);
    }
    next();
  };
};

module.exports = validate;
