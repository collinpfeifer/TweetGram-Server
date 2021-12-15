const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserInputError } = require('apollo-server');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    process.env.SECRET,
    { expiresIn: '1hr' }
  );
};

const {
  validateInfoInput,
  validateLoginInput,
} = require('../../utils/validators');

module.exports = {
  Mutation: {
    async login(_, { loginInput: { username, password } }) {
      const { errors, valid } = validateLoginInput(username, password);
      const user = await User.findOne({ username });

      if (!valid) {
        throw new UserInputError('User not valid', { errors });
      }

      if (!user) {
        errors.general = 'User not found';
        throw new UserInputError('User not found', { errors });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        errors.general = 'Wrong credentials';
        throw new UserInputError('Wrong Credentials', { errors });
      }

      const token = generateToken(user);

      return {
        ...user._doc,
        id: user._id,
        token,
      };
    },

    async register(
      _,
      {
        registerInput: {
          firstName,
          lastName,
          username,
          email,
          password,
          confirmPassword,
          id,
        },
      }
    ) {
      const { valid, errors } = validateInfoInput(
        firstName,
        lastName,
        username,
        email,
        password,
        confirmPassword
      );
      if (!valid) {
        throw new UserInputError('Errors', { errors });
      }
      const user =
        (await User.findOne({ username })) || (await User.findOne({ email }));

      if (user) {
        throw new UserInputError('Username or email address is taken', {
          errors: {
            error: 'This username or email address is taken',
          },
        });
      }
      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = new User({
        firstName: firstName,
        lastName: lastName,
        email: email,
        username: username,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      });

      const res = await newUser.save();

      const token = generateToken(res);

      return {
        ...res._doc,
        id: res._id,
        token,
      };
    },
  },
  async edit(
    _,
    firstName,
    lastName,
    username,
    email,
    password,
    confirmPassword,
    id
  ) {
    const { valid, errors } = validateInfoInput(
      firstName,
      lastName,
      username,
      email,
      password,
      confirmPassword
    );
    if (!valid) {
      throw new UserInputError('Errors', { errors });
    }
    const user =
      (await User.findOne({ username })) || (await User.findOne({ email }));
    if (user) {
      throw new UserInputError('Username or email address is taken', {
        errors: {
          error: 'This username or email address is taken',
        },
      });
    }

    password = await bcrypt.hash(password, 12);

    const newUser = new User({
      email,
      username,
      password,
    });

    const res = await newUser.updateOne(id);

    const token = generateToken(res);

    return {
      ...res._doc,
      id: res._id,
      token,
    };
  },
};
