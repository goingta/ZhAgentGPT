import type { ReactNode } from "react";
import React, { useEffect, useRef, useState } from "react";
import {
  FaBrain,
  FaClipboard,
  FaListAlt,
  FaPlayCircle,
  FaStar,
  FaCopy,
  FaImage,
} from "react-icons/fa";
import PopIn from "./motions/popin";
import Expand from "./motions/expand";
import * as htmlToImage from "html-to-image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import Button from "./Button";
import { useRouter } from "next/router";
import WindowButton from "./WindowButton";
import PDFButton from "./pdf/PDFButton";
import FadeIn from "./motions/FadeIn";

interface ChatWindowProps extends HeaderProps {
  children?: ReactNode;
  className?: string;
  messages: Message[];
  showDonation: boolean;
}

const messageListId = "chat-window-message-list";

const ChatWindow = ({
  messages,
  children,
  className,
  title,
  showDonation,
}: ChatWindowProps) => {
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

    // Use has scrolled if we have scrolled up at all from the bottom
    if (scrollTop < scrollHeight - clientHeight - 10) {
      setHasUserScrolled(true);
    } else {
      setHasUserScrolled(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom on re-renders
    if (scrollRef && scrollRef.current) {
      if (!hasUserScrolled) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  });

  return (
    <div
      className={
        "border-translucent flex w-full flex-col rounded-2xl border-2 border-white/20 bg-zinc-900 text-white shadow-2xl drop-shadow-lg " +
        (className ?? "")
      }
    >
      <MacWindowHeader title={title} messages={messages} />
      <div
        className="window-heights mb-2 mr-2"
        ref={scrollRef}
        onScroll={handleScroll}
        id={messageListId}
      >
        {messages.map((message, index) => (
          <FadeIn key={`${index}-${message.type}`}>
            <ChatMessage message={message} />
          </FadeIn>
        ))}
        {children}

        {messages.length === 0 && (
          <>
            <Expand delay={0.8} type="spring">
              <ChatMessage
                message={{
                  type: "system",
                  value:
                    "> 通过添加名称/目标并点击deploy来创建任务！",
                }}
              />
            </Expand>
            <Expand delay={0.9} type="spring">
              <ChatMessage
                message={{
                  type: "system",
                  value:
                    "📢 您可以在设置选项卡中提供自己的OpenAI API密钥，以增加限制！",
                }}
              />
              {showDonation && (
                <Expand delay={0.7} type="spring">
                  <DonationMessage />
                </Expand>
              )}
            </Expand>
          </>
        )}
      </div>
    </div>
  );
};

interface HeaderProps {
  title?: string | ReactNode;
  messages: Message[];
}

const MacWindowHeader = (props: HeaderProps) => {
  const saveElementAsImage = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    htmlToImage
      .toJpeg(element, {
        height: element.scrollHeight,
        style: {
          overflowY: "visible",
          maxHeight: "none",
          border: "none",
        },
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "agent-gpt-output.png";
        link.click();
      })
      .catch(console.error);
  };

  const copyElementText = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    const text = element.innerText;
    void navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex items-center gap-1 overflow-hidden rounded-t-3xl p-3">
      <PopIn delay={0.4}>
        <div className="h-3 w-3 rounded-full bg-red-500" />
      </PopIn>
      <PopIn delay={0.5}>
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
      </PopIn>
      <PopIn delay={0.6}>
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </PopIn>
      <div className="flex flex-grow font-mono text-sm font-bold text-gray-600 sm:ml-2">
        {props.title}
      </div>
      <WindowButton
        delay={0.7}
        onClick={(): void => saveElementAsImage(messageListId)}
        icon={<FaImage size={12} />}
        text={"图片"}
      />

      <WindowButton
        delay={0.8}
        onClick={(): void => copyElementText(messageListId)}
        icon={<FaClipboard size={12} />}
        text={"复制"}
      />
      <PDFButton messages={props.messages} />
    </div>
  );
};
const ChatMessage = ({ message }: { message: Message }) => {
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopyClick = () => {
    void navigator.clipboard.writeText(message.value);
    setCopied(true);
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (copied) {
      timeoutId = setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [copied]);

  return (
    <div
      className="mx-2 my-1 rounded-lg border-[2px] border-white/10 bg-white/20 p-1 font-mono text-sm hover:border-[#1E88E5]/40 sm:mx-4 sm:p-3 sm:text-base"
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
      onClick={handleCopyClick}
    >
      {message.type != "system" && (
        // Avoid for system messages as they do not have an icon and will cause a weird space
        <>
          <div className="mr-2 inline-block h-[0.9em]">
            {getMessageIcon(message)}
          </div>
          <span className="mr-2 font-bold">{getMessagePrefix(message)}</span>
        </>
      )}

      {message.type == "thinking" && (
        <span className="italic text-zinc-400">
          (如果需要30秒以上的时间，请重新启动)
        </span>
      )}

      {message.type == "action" ? (
        <div className="prose ml-2 max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {message.value}
          </ReactMarkdown>
        </div>
      ) : (
        <span>{message.value}</span>
      )}

      <div className="relative">
        {copied ? (
          <span className="absolute bottom-0 right-0 rounded-full border-2 border-white/30 bg-zinc-800 p-1 px-2 text-gray-300">
            Copied!
          </span>
        ) : (
          <span
            className={`absolute bottom-0 right-0 rounded-full border-2 border-white/30 bg-zinc-800 p-1 px-2 ${
              showCopy ? "visible" : "hidden"
            }`}
          >
            <FaCopy className="text-white-300 cursor-pointer" />
          </span>
        )}
      </div>
    </div>
  );
};

const DonationMessage = () => {
  const router = useRouter();

  return (
    <div className="mx-2 my-1 flex flex-col gap-2 rounded-lg border-[2px] border-white/10 bg-blue-500/20 p-1 font-mono hover:border-[#1E88E5]/40 sm:mx-4 sm:flex-row sm:p-3 sm:text-center sm:text-base">
      <div className="max-w-none flex-grow">
        💝️ 帮助支持AgentGPT的发展。 💝
        <br />
        请考虑赞助GitHub上的项目。
      </div>
      <div className="flex items-center justify-center">
        <Button
          className="sm:text m-0 rounded-full text-sm "
          onClick={() =>
            void router.push("https://github.com/microcodor/ZhAgentGPT")
          }
        >
          Support now 🚀
        </Button>
      </div>
    </div>
  );
};

const getMessageIcon = (message: Message) => {
  switch (message.type) {
    case "goal":
      return <FaStar className="text-yellow-300" />;
    case "task":
      return <FaListAlt className="text-gray-300" />;
    case "thinking":
      return <FaBrain className="mt-[0.1em] text-pink-400" />;
    case "action":
      return <FaPlayCircle className="text-green-500" />;
  }
};

const getMessagePrefix = (message: Message) => {
  switch (message.type) {
    case "goal":
      return "开始一个新的目标:";
    case "task":
      return "已添加任务:";
    case "thinking":
      return "思考中...";
    case "action":
      return message.info ? message.info : "执行中:";
  }
};

export interface Message {
  type: "goal" | "thinking" | "task" | "action" | "system";
  info?: string;
  value: string;
}

export default ChatWindow;
export { ChatMessage };
