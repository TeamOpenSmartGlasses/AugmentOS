// src/types/events/display.ts

import type { WebSocketMessage } from "../websocket/common";

export interface TextWall {
  layoutType: 'text_wall';
  text: string;
}

export interface DoubleTextWall {
  layoutType: 'double_text_wall';
  topText: string;
  bottomText: string;
}

export interface DashboardCard {
  layoutType: 'dashboard_card';
  leftText: string;
  rightText: string;
}

export interface ReferenceCard {
  layoutType: 'reference_card';
  title: string;
  text: string;
}

export interface DisplayRequest extends WebSocketMessage {
  type: 'display_event'; // not gonna make this match so we don't have to change it everywhere. maybe theres a better way to manage enums in typescript so we can leverage them.
  packageName: "system" | string;
  view: "dashboard" | string;
  layout: Layout;
  durationMs?: number;
  timestamp: Date;
}

export type Layout = TextWall | DoubleTextWall | DashboardCard | ReferenceCard;
