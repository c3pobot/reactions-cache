'use strict'

const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Etc/GMT+5',
  hour12: false,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

function getTimeStamp(timestamp = Date.now()) {
  return timestampFormatter.format(new Date(timestamp));
}

module.exports.error = (err)=>{
  console.error(`${getTimeStamp(Date.now())} ERROR [reactions-cache] ${err}`)
  if(err?.stack) console.error(err)
}
module.exports.info = (msg)=>{
  console.log(`${getTimeStamp(Date.now())} INFO [reactions-cache] ${msg}`)
}
