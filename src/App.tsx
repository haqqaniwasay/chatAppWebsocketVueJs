import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChatClient } from "./chat-client";
const URL = "wss://hy75nub966.execute-api.us-east-2.amazonaws.com/dev/";

const RECONNECT_INTERVAL = 5 * 60 * 1000; // 1.5 hours in milliseconds

const App = () => {
  const socket = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [senderId, setSenderId] = useState("");
  const [members, setMembers] = useState([]);
  const [chatRows, setChatRows] = useState<React.ReactNode[]>([]);
  const reconnectTimer = useRef<number | null>(null);

  // Function to log every 5 minutes
  const logEvery5Minutes = useCallback(() => {
    console.log("Logging something every 5 minutes");
    socket.current?.send(
      JSON.stringify({
        action: "pingPong",
      })
    );
  }, []);

  // Function to reconnect the socket silently
  const reconnectSocket = useCallback(() => {
    if (!isConnected) {
      console.log("Reconnecting socket...");
      if (socket.current) {
        console.log("socket open, so closing it....");
        socket.current.close();
      }
      socket.current = new WebSocket(URL);
      socket.current.addEventListener("open", () => {
        console.log("socket opened again");
        setIsConnected(true);
        clearInterval(reconnectTimer.current!);
      });
      socket.current.addEventListener("close", () => {
        console.log("new one closed");
        setIsConnected(false);
        setMembers([]);
        setChatRows([]);
      });
      socket.current.addEventListener("message", (event) => {
        console.debug("HAHAHAHA MSG AGYA:", event);
        onSocketMessage(event.data);
      });
    }
  }, [isConnected]);

  const onSocketOpen = useCallback(() => {
    const name = prompt("Enter your name");
    socket.current?.send(JSON.stringify({ action: "setName", name }));
    setSenderId(name as string);
    setIsConnected(true);
    socket.current?.send(JSON.stringify({ action: "addUser", userId: name }));
    // Start logging every 5 minutes
    const intervalId = setInterval(logEvery5Minutes, 5 * 60 * 1000);

    // Start reconnect timer
    // reconnectTimer.current = setInterval(reconnectSocket, RECONNECT_INTERVAL);

    // Cleanup function to clear interval on socket close
    return () => {
      clearInterval(intervalId);
      // clearInterval(reconnectTimer.current!);
    };
  }, []);
  const onSocketClose = useCallback(() => {
    setMembers([]);
    setIsConnected(false);
    setChatRows([]);
  }, []);
  const onSocketMessage = useCallback((dataStr) => {
    const data = JSON.parse(dataStr);
    console.log("data", data);
    if (data.members) {
      setMembers(data.members);
    } else if (data.publicMessage) {
      setChatRows((oldArray) => [
        ...oldArray,
        <span>
          <b>{data.publicMessage}</b>
        </span>,
      ]);
    } else if (data.privateMessage) {
      alert(data.privateMessage);
    } else if (data.systemMessage) {
      setChatRows((oldArray) => [
        ...oldArray,
        <span>
          <i>{data.systemMessage}</i>
        </span>,
      ]);
    }
  }, []);
  const onConnect = useCallback(() => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      socket.current = new WebSocket(URL);
      socket.current.addEventListener("open", onSocketOpen);
      socket.current.addEventListener("close", onSocketClose);
      socket.current.addEventListener("message", (event) => {
        console.debug("HAHAHAHA MSG AGYA:", event);
        onSocketMessage(event.data);
      });
    }
  }, []);
  useEffect(() => {
    return () => {
      socket.current?.close();
    };
  }, []);
  const onSendPrivateMessage = useCallback((to: string) => {
    const message = prompt("Enter private message for " + to);
    // socket.current?.send(
    //   JSON.stringify({
    //     action: "sendPrivate",
    //     message,
    //     to,
    //   })
    // );
    socket.current?.send(
      JSON.stringify({
        action: "sendMessage",
        conversationId: "conversationId",
        senderId: senderId,
        message,
        receiverId: to,
      })
    );
  }, []);
  const onSendPublicMessage = useCallback(() => {
    const message = prompt("Enter public message");
    socket.current?.send(
      JSON.stringify({
        action: "sendPublic",
        message,
      })
    );
  }, []);
  const onSendMessage = useCallback(() => {
    // const message = prompt('Enter public message');
    socket.current?.send(
      JSON.stringify({
        action: "sendMessage",
        conversationId: "conversationId",
        senderId: "123",
        message: "message",
        receiverId: "123",
      })
    );
  }, []);
  const onDisconnect = useCallback(() => {
    if (isConnected) {
      socket.current?.close();
    }
  }, [isConnected]);
  return (
    <ChatClient
      isConnected={isConnected}
      members={members}
      chatRows={chatRows}
      onPublicMessage={onSendPublicMessage}
      onPrivateMessage={onSendPrivateMessage}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      onSendMessage={onSendMessage}
    />
  );
};
export default App;
