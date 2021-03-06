require("dotenv").config();
const bcrypt = require("bcrypt");
const validator = require("validator");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Post = require("../models/post");

module.exports = {
  createUser: async (args, req) => {
    const { email, name, password } = args.signupInput;
    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: "이메일 형식이 잘못되었습니다" });
    }
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 4 })
    ) {
      errors.push({ message: "비밀번호의 형식이 잘못되엇습니다" });
    }
    if (errors.length > 0) {
      const error = new Error("회원가입 양식과 맞지 않는 입력입니다");
      error.code = 422;
      error.data = errors;
      throw error;
    }
    const user = await User.findOne({ email });
    if (user) {
      const error = new Error("이미 존재하는 계정 정보입니다!");
      error.code = 401;
      throw error;
    }
    const hash = await bcrypt.hash(password, 12);
    const createUser = new User({
      email,
      name,
      password: hash,
    });
    const newUser = await createUser.save();
    return {
      ...newUser._doc,
      _id: newUser._id.toString(),
    };
  },
  login: async (args, req) => {
    const { email, password } = args.loginInput;
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("일차하는 정보의 회원이 존재하지 않습니다");
      error.code = 401;
      throw error;
    }
    const pwdCorrect = await bcrypt.compare(password, user.password);
    // const pwdCorrect = await bcrypt.compare(user.password, password);
    // compare 파라미터의 순서는 중요하다 입력비밀번호, 해쉬된 유저의 비밀번호 순으로 해야함
    if (!pwdCorrect) {
      const error = new Error("아이디 혹은 패스워드가 일치하지 않습니다");
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      `${process.env.userLoginToken}`,
      { expiresIn: "3h" }
    );
    return {
      token,
      userId: user._id.toString(),
    };
  },
  createPost: async (args, req) => {
    console.log("creating post");
    if (!req.isAuth) {
      const error = new Error("로그인 후 이용해주세요");
      error.code = 401;
      throw error;
    }
    const { title, imageUrl, content } = args.postInput;
    if (!imageUrl) {
      imageUrl = "no image here";
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("예기치 못한 오류로 포스팅에 실패하였습니다");
      error.code = 401;
      throw error;
    }
    const post = new Post({
      title,
      imageUrl,
      content,
      creator: user,
    });
    const newPost = await post.save();
    user.posts.push(newPost);
    await user.save();
    return {
      ...newPost._doc,
      _id: newPost._id.toString(),
      createdAt: newPost.createdAt.toISOString(),
      updatedAt: newPost.updatedAt.toISOString(),
    };
  },
  posts: async (args, req) => {
    const page = args.page;
    if (!req.isAuth) {
      const error = new Error("로그인 후 이용해주세요");
      error.code = 401;
      throw error;
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");
    return {
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      totalPosts,
    };
  },
  post: async (args, req) => {
    const postId = args.postId;
    if (!req.isAuth) {
      const error = new Error("로그인 후 이용해주세요");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("해당 포스트가 존재하지 않습니다");
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  updatePost: async (args, req) => {
    const { postId, postInput } = args;
    if (!req.isAuth) {
      const error = new Error("로그인 후 이용해주세요");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("해당 포스트가 존재하지 않습니다");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("해당 게시글을 수정할 권한이 없습니다");
      error.code = 404;
      throw error;
    }
    const { title, content, imageUrl } = postInput;
    post.title = title;
    post.content = content;
    if (imageUrl !== "undefined") {
      post.imageUrl = imageUrl;
    }
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async (args, req) => {
    const { postId } = args;
    if (!req.isAuth) {
      const error = new Error("로그인 후 이용해주세요");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("해당 포스트가 존재하지 않습니다");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("해당 게시글을 삭제할 권한이 없습니다");
      error.code = 404;
      throw error;
    }
    const deletePost = await post.deleteOne({ _id: postId });
    return true;
  },
};
