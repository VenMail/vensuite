
export function sluggify(s: string): string {
    return s.replace("\s", "_").toLowerCase();
}
  