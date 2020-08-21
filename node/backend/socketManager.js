const Server = require("socket.io");
/**
 * must call set server before any other function
 * This is the class used for the progress bars. Could be adapted to include anything else that is requires two way communication.
 */
class SocketManager {
  /**
   *
   * @param {HttpServer} server
   */
  setServer(server) {
    this.io = new Server(server);
  }
  /**
   *
   * @param {()=>{}} middleware
   */
  setMiddleware(middleware) {
    this.io.use(middleware);
  }
  /**
   *
   * @param {string} event - check socket.io events such as connection,
   * @param {(socket)=>{}} callback
   */
  on(event, callback) {
    this.io.on(event, callback);
  }
  /**
   *
   * @param {string} event
   * @param {*} val
   * @param {string} socketId - should be store in req.session.socketId
   */
  send(event, val, socketId) {
    this.io.sockets.to(socketId).emit(event, val);
  }
}
const socketManager = new SocketManager();
/**
 * singleton export
 */
module.exports = socketManager;
