// tiny helpers to keep things consistent

export function truncate(label: string, max = 22) {
    if (label.length <= max) return label;
    return label.slice(0, max - 1) + "…";
}
