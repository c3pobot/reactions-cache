'use strict'
const { DataApiClient } = require('rqlite-js')
const log = require('./logger')

const CACHE_HOSTS = process.env.REACTION_CACHE_URL || ['http://reactions-cache-0.reactions-cache.datastore.svc.cluster.local:4001', 'http://reactions-cache-1.reactions-cache.datastore.svc.cluster.local:4001', 'http://reactions-cache-2.reactions-cache.datastore.svc.cluster.local:4001']

const dataApiClient = new DataApiClient(CACHE_HOSTS)
let TABLE_SET = new Set()

async function checkTableExists(table){
  try{
    if(TABLE_SET.has(table)) return true

    let sql = `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
    let dataResults = await dataApiClient.query(sql)
    if(dataResults?.hasError()){
      log.error(dataResults)
      return
    }
    if(dataResults?.get(0)?.data?.name == table){
      TABLE_SET.add(table)
      return true
    }
  }catch(e){
    log.error(e)
  }
}
async function createTable(table){
  try{
    let sql = `CREATE TABLE IF NOT EXISTS "${table}" (id INTEGER PRIMARY KEY AUTOINCREMENT, trigger TEXT NOT NULL UNIQUE, response TEXT NOT NULL, anywhere INTEGER, ttl INTEGER)`
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      log.error(dataResults)
      return
    }
    TABLE_SET.add(table)
    return true
  }catch(e){
    log.error(e)
  }
}
async function tableCheck(table){
  try{
    if(!table) return;

    let status = await checkTableExists(table)
    if(!status) status = await createTable(table)

    return status
  }catch(e){
    log.error(e)
  }
}
async function addReaction(table, { trigger, response, anywhere }){
  try{
    if(!trigger || !response || !table) return
    let status = await tableCheck(table)
    if(!status){
      log.error(`Could not create reaction table for ${table}`)
      return
    }
    let sql = [
      [`INSERT INTO "${table}" (trigger, response, anywhere, ttl) VALUES(:trigger, :response, :anywhere, ${Date.now()})`, { trigger, response, anywhere: +(anywhere ? 1:0) }]
    ]
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      log.error(dataResults)
      return
    }
    return dataResults?.get(0)?.getLastInsertId()
  }catch(e){
    log.error(e)
  }
}
async function updateReaction(table, { id, trigger, response, anywhere }){
  try{
    if(!(id >= 0) || !trigger || !response || !table) return
    let status = await checkTableExists(table)
    if(!status) return

    let sql = [
      [`UPDATE "${table}" SET trigger=:trigger, response=:response, anywhere=:anywhere, ttl=${Date.now()} WHERE id=:id`, { id, trigger, response, anywhere: +(anywhere ? 1:0) }]
    ]
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      log.error(dataResults)
      return
    }
    return dataResults?.get(0)?.getRowsAffected()
  }catch(e){
    log.error(e)
  }
}
async function getReactions(table){
  try{
    if(!table) return
    let status = await checkTableExists(table)
    if(!status) return

    let sql = `SELECT id, trigger, response, anywhere FROM "${table}"`
    let dataResults = await dataApiClient.query(sql)
    if(dataResults.hasError()){
      log.error(dataResults)
      return
    }
    return dataResults?.toArray()
  }catch(e){
    log.error(e)
  }
}
async function delReaction(table, id){
  try{
    if(!table) return
    let status = await checkTableExists(table)
    if(!status) return

    let sql = `DELETE FROM "${table}" WHERE id=${id}`
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      log.error(dataResults)
      return
    }
    return dataResults?.get(0)?.getRowsAffected()
  }catch(e){
    log.error(e)
  }
}
async function clearReactions(table){
  try{
    if(!table) return
    let status = await checkTableExists(table)
    if(!status) return

    let sql = `DROP TABLE "${table}"`
    let dataResults = await dataApiClient.execute(sql)
    if(dataResults?.hasError()){
      log.error(dataResults)
      return
    }
    return dataResults?.get(0)?.getRowsAffected()
  }catch(e){
    log.error(e)
  }
}
module.exports = {
  add: addReaction,
  del: delReaction,
  get: getReactions,
  drop: clearReactions,
  update: updateReaction
}
