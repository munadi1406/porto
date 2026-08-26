// WebSocket Message Types — shared between server and client

// === Client → Server ===
export interface SubscribeMessage {
    type: "subscribe";
    tickers: string[];
}

export interface UnsubscribeMessage {
    type: "unsubscribe";
    tickers: string[];
}

export interface PingMessage {
    type: "ping";
}

export type ClientMessage = SubscribeMessage | UnsubscribeMessage | PingMessage;

// === Server → Client ===
export interface PriceData {
    ticker: string;
    price: number;
    change: number;
    changePercent: number;
    name?: string;
    high52w?: number;
}

export interface PriceUpdateMessage {
    type: "price_update";
    data: Record<string, {
        ticker: string;
        price: number;
        change: number;
        changePercent: number;
        name?: string;
        high52w?: number;
    }>;
    timestamp: number;
}

export interface MarketStatusMessage {
    type: "market_status";
    isOpen: boolean;
    session: "pre_open" | "trading" | "post_close" | "closed";
}

export interface PongMessage {
    type: "pong";
    timestamp: number;
}

export interface WelcomeMessage {
    type: "welcome";
    sessionId: string;
    marketOpen: boolean;
}

export interface ErrorMessage {
    type: "error";
    message: string;
}

export type ServerMessage =
    | PriceUpdateMessage
    | MarketStatusMessage
    | PongMessage
    | WelcomeMessage
    | ErrorMessage;
