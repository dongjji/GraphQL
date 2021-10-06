const { graphql, buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Query {
        hello: String
    }
    type Mutation {
        createUser(signupInput: signupInput!) : User!
        login(loginInput: loginInput!) : AuthData!
        createPost(postInput: postInput!) : Post!
    }
    type User {
        _id: ID!
        name: String!
        email: String!
        password: String!
        status: String
        posts: [Post!]!
    }
    type AuthData {
        token: String!
        userId: String!
    }
    type Post {
        _id: ID!
        title: String!
        imageUrl: String!
        content: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }
    input signupInput {
        email: String!
        name: String!
        password: String!
    }
    input loginInput {
        email: String!
        password: String!
    }
    input postInput {
        title: String!
        imageUrl: String!
        content: String!
    }
    schema {
        query: Query
        mutation: Mutation
    }
`);
