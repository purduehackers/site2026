// The grants site's published project catalog. Keep the homepage selection
// small while letting names, authors, and descriptions follow its source.
const PROJECTS_URL =
  'https://raw.githubusercontent.com/purduehackers/ugrants/main/src/assets/projects.json';
const FEATURED_IDS = ['beacons', 'poas'];

export interface FundedProject {
  name: string;
  authors: string;
  description: string;
}

export async function getFundedProjects(
  request: typeof fetch = fetch
): Promise<FundedProject[]> {
  try {
    const response = await request(PROJECTS_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return [];
    const projects = await response.json();
    if (!Array.isArray(projects)) return [];
    return FEATURED_IDS.flatMap((id) => {
      const project = projects.find((item) => item?.id === id);
      if (
        typeof project?.name !== 'string' || !project.name.trim() ||
        typeof project.description !== 'string' || !project.description.trim() ||
        !Array.isArray(project.authors)
      ) return [];
      const authors = project.authors
        .filter((author: { name?: unknown } | null) => typeof author?.name === 'string' && author.name.trim())
        .map((author: { name: string }) => author.name.trim());
      if (!authors.length) return [];
      return [{ name: project.name, authors: authors.join(' & '), description: project.description }];
    });
  } catch {
    // Keep the funding explanation and application link if the catalog fails.
    return [];
  }
}
