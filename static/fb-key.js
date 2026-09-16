/** Firebase RTDB không cho dấu chấm trong key: vt.cantho → vt,cantho */
function fbUserKey(username) {
  return String(username || "").trim().replace(/\./g, ",");
}
function fbUsernameFrom(key, rec) {
  if (rec && rec.username) return rec.username;
  return String(key || "").replace(/,/g, ".");
}
function fbUserRef(db, username) {
  return db.ref("users/" + fbUserKey(username));
}
