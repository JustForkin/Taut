import BasePlugin from "./basePlugin";

export default class MarkdownLinks extends BasePlugin {
    public constructor(name: string, settings: any) {
        super(name, settings);

        this.shouldInterceptXHR = true;
    }

    public async init(): Promise<void> {
        const old = await this.getElement(() => {
            const w = window as any;
            return w.TS && w.TS.format && w.TS.format.formatWithOptions;
        });

        const w = window as any;
        w.TS.format.formatWithOptions = (t, n, r) => {
            if (r && r.for_edit) {
                t = t.replace(/<(?!!)([^<>\|]+)\|([^<>]+)>/g, (_, url, title) => `[${title}](${url})`);
            }
            return old(t, n, r);
        };
    }

    public interceptXHR(request, method, path, async) {
        if (path.startsWith("/api/conversations.setTopic") || path.startsWith("/api/chat.postMessage") || path.startsWith("/api/chat.update")) {
            const oldSend = request.send.bind(request);
            const send = e => {
                // setTopic has the "topic" key, while "postMessage" and "update" use the "text" key
                const key = e.has("topic") ? "topic" : "text";

                let text = e.get(key);
                text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, text, url) => `<${url}|${text}>`);
                e.set(key, text);

                // on chat update, we need to disable their parsing logic
                if (path.startsWith("/api/chat.update")) {
                    e.set("parse", "none");
                }

                oldSend(e);
            };
            request.send = send.bind(request);
        }
    }
}
