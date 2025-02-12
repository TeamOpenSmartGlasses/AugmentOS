// src/types/events/display.ts

export interface TextWall {
  layoutType: 'text_wall';
  text: string;
}

export interface DoubleTextWall {
  layoutType: 'double_text_wall';
  topText: string;
  bottomText: string;
}

export interface ReferenceCard {
  layoutType: 'reference_card';
  title: string;
  text: string;
}

export type Layout = TextWall | DoubleTextWall | ReferenceCard;
