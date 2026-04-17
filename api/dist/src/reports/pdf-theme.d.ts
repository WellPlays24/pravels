export declare const REPORT_THEME: {
    readonly primary: "#f97316";
    readonly accent: "#facc15";
    readonly onPrimary: "#ffffff";
    readonly ink: "#111827";
    readonly muted: "#374151";
    readonly border: "#e5e7eb";
    readonly summaryBg: "#ffedd5";
    readonly summaryFg: "#9a3412";
    readonly attendeesBg: "#fef9c3";
    readonly attendeesFg: "#854d0e";
};
export declare function drawReportHeader(doc: any, opts: {
    communityName: string;
    title?: string;
    logoPath?: string | null;
    margin: number;
}): {
    headerHeight: number;
};
