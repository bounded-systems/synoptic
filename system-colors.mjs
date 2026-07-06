// CSS Color 4 <system-color> keywords — SEMANTIC color KEYS (theme-resolved), a level
// ABOVE named colors: a role, not a fixed value. Our contextual token roles map straight
// onto these (body.fg ↔ CanvasText, body.bg ↔ Canvas), so system colors are the standard
// semantic color vocabulary we've been rediscovering. Keyed by lowercase; canonical name
// + meaning + the role in our scheme.
export const SYSTEM = {
  accentcolor:      { name: "AccentColor",      meaning: "accented control background", role: "accent" },
  accentcolortext:  { name: "AccentColorText",  meaning: "accented control text",       role: "accent-fg" },
  activetext:       { name: "ActiveText",       meaning: "active link text",            role: "link-active" },
  buttonborder:     { name: "ButtonBorder",     meaning: "button base border",          role: "border" },
  buttonface:       { name: "ButtonFace",       meaning: "button background",           role: "control-bg" },
  buttontext:       { name: "ButtonText",       meaning: "button text",                 role: "control-fg" },
  canvas:           { name: "Canvas",           meaning: "document background",         role: "bg" },
  canvastext:       { name: "CanvasText",       meaning: "document text",               role: "fg" },
  field:            { name: "Field",            meaning: "input background",            role: "field-bg" },
  fieldtext:        { name: "FieldText",        meaning: "input text",                  role: "field-fg" },
  graytext:         { name: "GrayText",         meaning: "disabled text",               role: "fg-disabled" },
  highlight:        { name: "Highlight",        meaning: "selection background",        role: "selection-bg" },
  highlighttext:    { name: "HighlightText",    meaning: "selection text",              role: "selection-fg" },
  linktext:         { name: "LinkText",         meaning: "unvisited link text",         role: "link" },
  mark:             { name: "Mark",             meaning: "marked-text background",      role: "mark-bg" },
  marktext:         { name: "MarkText",         meaning: "marked-text text",            role: "mark-fg" },
  selecteditem:     { name: "SelectedItem",     meaning: "selected-item background",    role: "selected-bg" },
  selecteditemtext: { name: "SelectedItemText", meaning: "selected-item text",          role: "selected-fg" },
  visitedtext:      { name: "VisitedText",      meaning: "visited link text",           role: "link-visited" },
};
