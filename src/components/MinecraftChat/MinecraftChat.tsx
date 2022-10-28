import React, {
    CSSProperties,
    HTMLAttributeAnchorTarget, MouseEvent, PropsWithChildren,
    PropsWithoutRef,
    useEffect, useState
} from "react";
import {ClickEvent, Component, HoverEvent} from "../../model/component";

class Props {
    /**
     * The component or components to render.
     */
    component : Component | Component[];

    /**
     * The speed (in milliseconds) that obfuscated text updates, set to null to disable. Defaults to 50ms.
     */
    obfuscationSpeed? : number;

    /**
     * If hover components should be rendered. Defaults to true.
     */
    useHover? : boolean;

    /**
     * The target for click events with the type open_url. Defaults to _blank.
     */
    openUrlTarget? : HTMLAttributeAnchorTarget;
}

function MinecraftChat(props : PropsWithoutRef<Props>) {
    let components = props.component ?? [];
    if (!Array.isArray(components)) components = [components];

    let obfuscationSpeed = props.obfuscationSpeed;
    if (obfuscationSpeed == undefined) obfuscationSpeed = 50;

    let openUrlTarget = props.openUrlTarget;
    if (openUrlTarget == undefined) openUrlTarget = "_blank";

    let useHover = props.useHover;
    if (useHover == undefined) useHover = true;

    return <div {...props}>
        {
            components.map((component, i) =>
                <InternalComponent
                    styles={{}}
                    component={component}
                    obfuscationSpeed={obfuscationSpeed}
                    useHover={useHover}
                    openUrlTarget={openUrlTarget}
                    key={i}
                />
            )
        }
    </div>
}

class InternalProps {
    component : Component | string;
    obfuscationSpeed? : number;
    useHover? : boolean;
    openUrlTarget? : HTMLAttributeAnchorTarget;
    styles : CSSProperties;
}

function InternalComponent(props : PropsWithoutRef<InternalProps>) {
    let comp = props.component;
    let component : Component = (typeof comp === "string" ? {text: comp as String} : comp) as Component;
    if (!component) return <></>

    let style : CSSProperties = props.styles;

    let bold : boolean = component.bold;
    let italic : boolean = component.italic;
    let obfuscation : boolean = component.obfuscation;
    let underlined : boolean = component.underlined;
    let strikethrough : boolean = component.strikethrough;
    let color = getColor(component.color);

    if (bold != undefined) style.fontWeight = bold ? "bold" : undefined;
    if (italic != undefined) style.fontStyle = italic ? "italic" : undefined;

    let decoration = [];
    if (underlined) decoration.push("underline");
    if (strikethrough) decoration.push("line-through");
    if (decoration) style.textDecoration = decoration.length > 0 ? decoration.join(" ") : undefined;

    if (color) style.color = color;

    return <>
        <Click component={component} openUrlTarget={props.openUrlTarget}>
            <Hover hoverEvent={props.useHover != null ? component.hoverEvent : null}>
                <Content
                    component={component}
                    style={style}
                    obfuscated={obfuscation}
                    obfuscationSpeed={props.obfuscationSpeed}
                />
            </Hover>
        </Click>
        {
            /* Children */
            component.extra != null &&
            component.extra.map((child, i) =>
                <InternalComponent
                    key={i}
                    component={child}
                    styles={{...style}}
                    obfuscationSpeed={props.obfuscationSpeed}
                    openUrlTarget={props.openUrlTarget}
                />)
        }
    </>
}

class HoverProps {
    hoverEvent : HoverEvent;
}

function Hover(props : PropsWithChildren<HoverProps>) {
    let hoverEvent : HoverEvent = props.hoverEvent;
    switch (hoverEvent?.action ?? "") {
        case "show_text":
            return <HoverShowText hoverEvent={hoverEvent}>{props.children}</HoverShowText>
        case "show_item":
        case "show_entity":
        default:
            return <>{props.children}</>
    }
}

function HoverShowText(props : PropsWithChildren<HoverProps>) {
    let [shown, setShown] = useState(false);
    let [x, setX] = useState(0);
    let [y, setY] = useState(0);

    function changePos(event : MouseEvent<HTMLSpanElement>) {
        setX(event.pageX + 15);
        setY(event.pageY + 15);
    }

    return <span
        onMouseEnter={event => {
            setShown(true);
            changePos(event);
        }}
        onMouseMove={event => changePos(event)}
        onMouseLeave={() => setShown(false)}
    >
        {props.children}
        <span style={{display: shown ? "block" : "none", position: "absolute", left: x, top: y}}>
            <InternalComponent component={props.hoverEvent.value} styles={{}}/>
        </span>
    </span>
}

class ClickProps {
    component : Component;
    openUrlTarget? : HTMLAttributeAnchorTarget;
}

function Click(props : PropsWithChildren<ClickProps>) {
    let component = props.component;

    let clickEvent : ClickEvent = component.clickEvent;
    switch (clickEvent?.action ?? "") {
        case "open_url":
            // set color & textDecoration to inherit to avoid blue/purple, underlined behaviour from the a-tag
            return <a href={clickEvent.value} target={"none"} style={{color: "inherit", textDecoration: "inherit"}}>
                {props.children}
            </a>
        case "copy_to_clipboard":
            // clipboard copying & pointer cursor
            return <span onClick={() => {
                navigator.clipboard.writeText(clickEvent.value).then(function() {}, function(e) {
                    console.error("Could not copy text to clipboard ", e);
                });
            }} style={{cursor: "pointer"}}>{props.children}</span>
        case "open_file":
        case "run_command":
        case "suggest_command":
        case "change-page":
            // not allowed to indicate an action that isn't supported in the browser
            return <span style={{cursor: "not-allowed"}}>{props.children}</span>
        default:
            return <>{props.children}</>
    }
}

class ContentProps {
    component : Component;
    style : CSSProperties;
    obfuscated : boolean;
    obfuscationSpeed? : number;
}

function Content(props : PropsWithoutRef<ContentProps>) {
    let component = props.component;

    return <span style={props.style}>
        {component.text
            ? <TextContainer
                component={component}
                obfuscated={props.obfuscated}
                obfuscationSpeed={props.obfuscationSpeed}
                {...props}/>
            : null}
    </span>
}

const obfCharacters : string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const obfCharacterCount : number = obfCharacters.length;

function TextContainer(props : PropsWithoutRef<ContentProps>) {
    if (!props.obfuscated) return <>{props.component.text as string}</>;

    let [obfContent, setObfContent] = useState(props.component.text as string);
    let changeContent = () => {
        let newContent = "";
        for (let i = 0; i < obfContent.length; i++) {
            newContent += obfCharacters.charAt(Math.floor(Math.random() * obfCharacterCount));
        }
        setObfContent(newContent);
    };

    useEffect(() => {
        if (props.obfuscationSpeed != null) {
            setTimeout(changeContent, props.obfuscationSpeed);
        }
    }, [obfContent]);
    useEffect(() => {
        if (props.obfuscationSpeed == null) {
            changeContent();
        }
    }, []);

    return <>{obfContent}</>;
}

type HEX = `#${string}`;
function getColor(color? : string) : HEX {
    if (color == null) return null;
    switch (color) {
        case "black": return "#000";
        case "dark_blue": return "#00A";
        case "dark_green": return "#0A0";
        case "dark_aqua": return "#0AA";
        case "dark_red": return "#A00";
        case "dark_purple": return "#A0A";
        case "gold": return "#FA0";
        case "gray": return "#AAA";
        case "dark_gray": return "#555";
        case "blue": return "#55F";
        case "green": return "#5F5";
        case "aqua": return "#5FF";
        case "red": return "#F55";
        case "light_purple": return "#F5F";
        case "yellow": return "#FF5";
        case "white": return "#FFF";
        default:
            if (!color.startsWith("#") || color.length != 7) return null;
            return color as HEX;
    }
}


export default MinecraftChat