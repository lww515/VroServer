const db = require('./db')
const sqlerrors = require('../errors/sql-errors')


// TODO (Lucas Wotton): Convert these results to return success instead of throwing exceptions
module.exports.getUserFollowerIds = async function(userId) {
  getUserFollowersQuery = `SELECT followingUserId FROM FOLLOWERS
                           WHERE followedUserId = ?`
  values = [userId]
  try {
    connection = await db.getConnection()
    output = await db.query(connection, getUserFollowersQuery, values)
    results = output.results
    err = output.err
    console.log('if err is non-null review this code in follow. err', err)
    return results
  } catch (err) {
    throw err
  }
}

module.exports.addFollower = async function(userId, newFollowerId) {
  addFollowerQuery = `INSERT INTO FOLLOWERS
                      VALUES (?, ?)`
  values = [newFollowerId, userId]
  transaction = null
  try {
    connection = await db.getConnection()
    transaction = await db.createTransaction(connection)
    keepConnection = true
    output = await db.query(transaction, addFollowerQuery, values, keepConnection)
    var newFollower = global.streamClient.feed('timeline', newFollowerId.toString());
    await newFollower.follow('user', userId.toString())
    await db.commitTransaction(transaction)
    return output.results
  } catch (err) {
    if (transaction) {
      await db.rollbackTransaction(transaction)
    }
    throw err
  }
}

module.exports.removeFollower = async function(userId, removeFollowerId) {
  removeFollowerQuery = `DELETE FROM FOLLOWERS
                         WHERE followingUserId = ? AND followedUserId = ?`
  values = [removeFollowerId, userId]
  calledGetStream = false
  transaction = null
  try {
    connection = await db.getConnection()
    transaction = await db.createTransaction(connection)
    keepConnection = true
    output = await db.query(transaction, removeFollowerQuery, values, keepConnection)
    var follower = global.streamClient.feed('timeline', removeFollowerId.toString());
    calledGetStream = true
    await follower.unfollow('user', userId.toString())
    await db.commitTransaction(transaction)
    return output.results
  } catch (err) {
    if (transaction) {
      await db.rollbackTransaction(transaction)
    }
    throw err
  }
}
