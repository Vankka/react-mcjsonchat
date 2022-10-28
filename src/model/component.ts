class Component {
    extra? : Component[];
    color? : string;
    font? : string;
    bold? : boolean;
    italic? : boolean;
    underlined? : boolean;
    strikethrough? : boolean;
    obfuscation? : boolean;
    clickEvent? : ClickEvent;
    hoverEvent? : HoverEvent;

    text? : string;
}

class ClickEvent {
    action : string;
    value : string;
}

class HoverEvent {
    action : string;
    value : any;
}

export {Component, ClickEvent, HoverEvent}