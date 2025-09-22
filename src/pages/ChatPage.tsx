import { useState, useEffect } from "react";
import { SourcesPanel } from "@/components/chat/SourcesPanel";
import { ChatSection } from "@/components/chat/ChatSection";
import { InsightsPanel } from "@/components/chat/InsightsPanel";
import { UploadModal } from "@/components/chat/UploadModal";
import { useFiles, useUploadFile, useChat } from "@/hooks/api";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  conversation_id?: string;
}

const ChatPage = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "sources" | "insights">("chat");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSourcesDesktop, setShowSourcesDesktop] = useState(true);
  const [showInsightsDesktop, setShowInsightsDesktop] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  const { toast } = useToast();
  const { data: filesData, isLoading, error, refetch } = useFiles();
  const uploadMutation = useUploadFile();
  const chatMutation = useChat();

  const uploadedFiles: UploadedFile[] =
    filesData?.files?.map((file) => ({
      id: file.file_id,
      name: file.filename,
      size: file.file_size,
      type: file.content_type,
      uploadedAt: new Date(file.uploaded_at),
    })) || [];

  useEffect(() => {
    if (!isLoading && uploadedFiles.length === 0) {
      setShowUploadModal(true);
    }
  }, [isLoading, uploadedFiles.length]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading files",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleFilesUploaded = async (files: File[]) => {
    try {
      for (const file of files) {
        await uploadMutation.mutateAsync(file);
      }
      await refetch();
      setShowUploadModal(false);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  useEffect(() => {
    if (selectedFiles.length === 0 && uploadedFiles.length > 0) {
      const firstFile = uploadedFiles[0];
      setSelectedFiles([firstFile.id]);
      setActiveDocument(firstFile.name);
      setActiveFileId(firstFile.id);
    }
  }, [uploadedFiles, selectedFiles.length]);

  const handleFileSelect = (fileId: string, selected: boolean) => {
    if (selected) {
      setSelectedFiles((prev) => [...prev, fileId]);
    } else {
      setSelectedFiles((prev) => prev.filter((id) => id !== fileId));
    }
  };

  const handleFileClick = (file: UploadedFile) => {
    setActiveDocument(file.name);
    setActiveFileId(file.id);
    if (!selectedFiles.includes(file.id)) {
      setSelectedFiles((prev) => [...prev, file.id]);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
      conversation_id: conversationId || undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    try {
      const response = await chatMutation.mutateAsync({
        message: text.trim(),
        file_id: activeFileId || undefined,
        conversation_id: conversationId || undefined,
      });
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }
      const aiMessage: Message = {
        id: response.message_id || (Date.now() + 1).toString(),
        text: response.response || "I received your message.",
        sender: "ai",
        timestamp: new Date(),
        conversation_id: response.conversation_id,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error: ${error?.message || "Please try again."}`,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4">Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-poppins bg-background flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap');
          .font-poppins { font-family: 'Poppins', sans-serif; }
        `}
      </style>

      <header className="fixed top-0 left-0 w-full z-20 bg-transparent py-4 px-6 flex justify-between items-center md:hidden">
        <a href="/" className="text-xl font-bold text-foreground z-30">Legal AI</a>
        <button onClick={() => setIsMobileMenuOpen((prev) => !prev)} className="z-30">
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          ) : (
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
          )}
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-10 bg-background p-6 pt-8">
          <nav className="flex flex-col items-start space-y-4">
            <a href="#" className="text-lg text-muted-foreground hover:text-foreground transition-colors">Overview</a>
            <a href="#" className="text-lg text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#" className="text-lg text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </nav>
        </div>
      )}

      <main className="flex-1 flex flex-row pt-16 md:pt-0" style={{ overflow: "hidden" }}>
        <div className="w-full flex flex-row" style={{ height: "100%" }}>
          <div
            className={`${mobileView === "sources" ? "block w-full h-full" : "hidden"} md:block md:h-full`}
            style={{
              overflow: "hidden",
              width: showSourcesDesktop ? undefined : 0,
              transition: "width 200ms ease",
            }}
          >
            {showSourcesDesktop && (
              <div className="md:w-80 lg:w-96 h-full">
                <SourcesPanel
                  uploadedFiles={uploadedFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onFileClick={handleFileClick}
                  onAddMore={() => setShowUploadModal(true)}
                />
              </div>
            )}
          </div>

          <div
            className={`${mobileView === "chat" ? "flex" : "hidden"} flex-1 flex-col`}
            style={{ minHeight: 0, overflow: "hidden", transition: "width 200ms ease" }}
          >
            <ChatSection
              activeDocument={activeDocument}
              hasDocuments={uploadedFiles.length > 0}
              activeFileId={activeFileId}
              onConversationIdChange={(id) => setConversationId(id)}
              messages={messages}
              inputText={inputText}
              setInputText={setInputText}
              sendMessage={sendMessage}
              isLoading={chatMutation.isPending}
              showSourcesDesktop={showSourcesDesktop}
              setShowSourcesDesktop={setShowSourcesDesktop}
              showInsightsDesktop={showInsightsDesktop}
              setShowInsightsDesktop={setShowInsightsDesktop}
            />
          </div>

          <div
            className={`${mobileView === "insights" ? "block w-full h-full" : "hidden"} md:hidden lg:block lg:h-full`}
            style={{
              overflow: "hidden",
              width: showInsightsDesktop ? undefined : 0,
              transition: "width 200ms ease",
            }}
          >
            {showInsightsDesktop && (
              <div className="lg:w-80 h-full">
                <InsightsPanel
                  activeDocument={activeDocument}
                  hasDocuments={uploadedFiles.length > 0}
                  activeFileId={activeFileId}
                  conversationId={conversationId}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="md:hidden flex justify-around p-2 border-t bg-background shadow-sm">
        <button
          onClick={() => setMobileView("sources")}
          className={`px-3 py-1 rounded-md text-sm font-medium ${mobileView === "sources" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Sources
        </button>
        <button
          onClick={() => setMobileView("chat")}
          className={`px-3 py-1 rounded-md text-sm font-medium ${mobileView === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Chat
        </button>
        <button
          onClick={() => setMobileView("insights")}
          className={`px-3 py-1 rounded-md text-sm font-medium ${mobileView === "insights" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Insights
        </button>
      </div>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFilesUploaded={handleFilesUploaded}
        currentFileCount={uploadedFiles.length}
        isUploading={uploadMutation.isPending}
      />
    </div>
  );
};

export default ChatPage;
