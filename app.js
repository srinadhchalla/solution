const express = require('express')
const app = express()
const path = require('path')
const dbpath = path.join(__dirname, 'twitterClone.db')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bycrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
app.use(express.json())
let db = null

const connectingdbandserver = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('serever is running at http://localhost/3000')
    })
  } catch (e) {
    console.log(`dberror:${e.message}`)
    process.exit(1)
  }
}
connectingdbandserver()

// require outputs

const requireOutput1 = object => {
  return {
    username: object.username,
    tweet: object.tweet,
    dateTime: object.date_time,
  }
}

const requireOutput2 = object => {
  return {
    replies: [object],
  }
}

// middleware

const middleware1 = async (request, response, next) => {
  const token = request.headers['authorization']

  let jwtToken
  if (token !== undefined) {
    jwtToken = token.split(' ')[1]
  }

  if (jwtToken !== undefined) {
    console.log(jwtToken)
    jwt.verify(jwtToken, 'My_Acceses_Token', (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
  }
}

//API 1

app.post('/register/', async (request, response) => {
  const {name, username, password, gender} = request.body
  console.log(name)
  const checkquery = `
  SELECT * from user WHERE username = "${username}";
  `
  const responce = await db.get(checkquery)
  console.log(responce)
  if (responce === undefined) {
    if (password.length > 6) {
      const encryptedPassword = await bycrypt.hash(request.body.password, 10)
      console.log(encryptedPassword)
      const dbquery = `
   INSERT INTO user(name, username, password, gender) 
   values(
    "${name}",
    "${username}",
    "${encryptedPassword}",
    "${gender}"
   )
   `
      await db.run(dbquery)
      response.send('User created successfully')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

// API 2

app.post('/login/', async (request, response) => {
  const {username, password} = request.body

  const checkuser = `SELECT * FROM user WHERE username = "${username}"`
  const responce = await db.get(checkuser)
  console.log(responce)
  if (responce !== undefined) {
    const checkingpassword = await bycrypt.compare(password, responce.password)
    console.log(checkingpassword)
    if (checkingpassword) {
      const payload = {
        username: username,
      }
      const jwtToken = await jwt.sign(payload, 'My_Acceses_Token')
      console.log(jwtToken)
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  } else {
    response.status(400)
    response.send('Invalid user')
  }
})

// API 3

app.get('/user/tweets/feed/', middleware1, async (request, response) => {
  const dbquery = `
  select username, tweet, date_time 
  from 
  (user inner join tweet on user.user_id = tweet.user_id)
   as T inner join follower on T.user_id = follower.following_user_id
   group by follower.following_user_id 
   order by follower.following_user_id 
   limit 4;`

  const responce = await db.all(dbquery)
  console.log(responce)
  response.send(responce.map(object => requireOutput1(object)))
})

// API 4

app.get('/user/following/', middleware1, async (request, response) => {
  const dbquery = `select name from
   user inner join follower on user.user_id = follower.following_user_id 
   group by follower.following_user_id;`

  const dbresponce = await db.all(dbquery)
  console.log(dbresponce)
  response.send(dbresponce)
})

// API 5

app.get('/user/followers/', middleware1, async (request, response) => {
  const dbquery = `select name from
   user inner join follower on user.user_id = follower.follower_user_id 
   group by follower.follower_user_id;`

  const dbresponce = await db.all(dbquery)
  console.log(dbresponce)
  response.send(dbresponce)
})

// API 6

app.get('/tweets/:tweetId/', middleware1, async (request, response) => {
  const {tweetId} = request.params

  const dbquery1 = `
  select follower.follower_user_id from tweet inner join follower on tweet.user_id = follower.following_user_id where tweet.tweet_id = ${tweetId}
  `
  const dbresponce = await db.get(dbquery1)
  console.log(dbresponce)
  if (dbresponce !== undefined) {
    console.log(tweetId)
    const dbquery = `
    select 
    tweet, count(like.like_id) as likes, count(reply.reply_id) as replies, date_time as dateTime
    from 
    (tweet inner join like on tweet.tweet_id = like.tweet_id) 
    as T inner join reply on T.tweet_id = reply.tweet_id 
    where 
    tweet.tweet_id = ${tweetId};`

    const dbresponce2 = await db.all(dbquery)

    response.send(dbresponce2)
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

// API 7

app.get('/tweets/:tweetId/likes/', middleware1, async (request, response) => {
  const {tweetId} = request.params

  const dbquery1 = `
  select follower.follower_user_id from tweet inner join follower on tweet.user_id = follower.following_user_id where tweet.tweet_id = ${tweetId}
  `
  const dbresponce = await db.get(dbquery1)
  console.log(dbresponce)
  if (dbresponce !== undefined) {
    console.log(tweetId)
    const dbquery = `
    select 
    name as names
    from 
    user inner join like on user.user_id = like.user_id 
    where 
    like.tweet_id = ${tweetId};`

    const dbresponce2 = await db.all(dbquery)

    response.send(dbresponce2)
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

// API 8

app.get('/tweets/:tweetId/replies/', middleware1, async (request, response) => {
  const {tweetId} = request.params

  const dbquery1 = `
  select follower.follower_user_id from tweet inner join follower on tweet.user_id = follower.following_user_id where tweet.tweet_id = ${tweetId}
  `
  const dbresponce = await db.get(dbquery1)
  console.log(dbresponce)
  if (dbresponce !== undefined) {
    console.log(tweetId)
    const dbquery = `
    select 
    name , reply
    from 
    (tweet inner join user on tweet.user_id = user.user_id)
    as T inner join reply on T.user_id = reply.user_id
    where 
    tweet.tweet_id = ${tweetId};`

    const dbresponce2 = await db.all(dbquery)

    response.send({
      replies: dbresponce2,
    })
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

// API 9

app.get('/user/tweets/', middleware1, async (request, response) => {
  const dbquery = `
 SELECT tweet, count(like_id) as likes, count(reply_id) as replies, tweet.date_time as dateTime  FROM (tweet inner join like on tweet.tweet_id = like.tweet_id) as T inner join reply on T.tweet_id = reply.tweet_id group by tweet.user_id;
`

  const dbresponce = await db.all(dbquery)

  response.send(dbresponce)
})

// API 10

app.post('/user/tweets/', middleware1, async (request, response) => {
  const {tweet} = request.body
  const dbquery = `
INSERT INTO tweet(tweet)
values(
  "${tweet}"
)
`
  await db.run(dbquery)

  response.send('Created a Tweet')
})

// API 11

app.delete('/tweets/:tweetId/', middleware1, async (request, response) => {
  const {tweetId} = request.params
  const dbquery = `
  select * from user inner join tweet on user.user_id = tweet.user_id where tweet_id = ${tweetId}`

  const dbresponce = await db.get(dbquery)
  console.log(dbresponce)

  if (dbresponce !== undefined) {
    const dbquery2 = `
  delete from tweet where tweet_id = ${tweetId}
  `
    await db.run(dbquery2)

    response.send('Tweet Removed')
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

module.exports = app
