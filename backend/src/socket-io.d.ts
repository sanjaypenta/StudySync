import "socket.io";

declare module "socket.io" {
  interface SocketData {
    studyRoomId?: string;
    studyUserId?: string;
  }
}
