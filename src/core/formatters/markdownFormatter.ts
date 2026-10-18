import { ISubmissionPayload, Difficulty, ISolvedProblemMetadata } from '../types';

export class MarkdownFormatter {
  /**
   * Generates problem directory path.
   * e.g. "leetcode/0001-two-sum"
   */
  public static getDirectoryPath(payload: ISubmissionPayload | ISolvedProblemMetadata): string {
    const rawId = (payload as any).problemId || payload.id || '';
    // If rawId is a submission ID (length > 6), ignore it so we don't prefix with submission ID
    const isSubmissionId = rawId.length > 6 && !isNaN(Number(rawId));
    const cleanId = isSubmissionId ? '' : rawId;

    const paddedId = cleanId ? cleanId.padStart(4, '0') : '';
    const folderName = paddedId ? `${paddedId}-${payload.titleSlug}` : payload.titleSlug;
    return `${payload.platform || 'leetcode'}/${folderName}`;
  }

  /**
   * Generates code filename based on language extension.
   * e.g. "Solution.cpp", "Solution.py", "Solution.java"
   */
  public static getCodeFileName(extension: string): string {
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    return `Solution${ext}`;
  }

  /**
   * Returns difficulty badge Markdown string.
   */
  public static getDifficultyBadge(difficulty: Difficulty): string {
    const diff = difficulty.toLowerCase();
    if (diff === 'easy' || diff === 'basic' || diff === 'school') {
      return '![Easy](https://img.shields.io/badge/Difficulty-Easy-brightgreen?style=flat-square)';
    }
    if (diff === 'medium') {
      return '![Medium](https://img.shields.io/badge/Difficulty-Medium-orange?style=flat-square)';
    }
    if (diff === 'hard') {
      return '![Hard](https://img.shields.io/badge/Difficulty-Hard-red?style=flat-square)';
    }
    return `![${difficulty}](https://img.shields.io/badge/Difficulty-${difficulty}-blue?style=flat-square)`;
  }

  /**
   * Formats the individual problem's README.md content.
   */
  public static formatReadme(payload: ISubmissionPayload, username = 'Inkesk-Dozing'): string {
    const badge = this.getDifficultyBadge(payload.difficulty);
    const topicsStr = payload.topics && payload.topics.length > 0
      ? payload.topics.map((t) => `\`${t}\``).join(', ')
      : 'General';

    const problemLink = `https://leetcode.com/problems/${payload.titleSlug}/`;

    return `# [${payload.problemId ? `${payload.problemId}. ` : ''}${payload.title}](${problemLink})

## Difficulty
${badge}

## Topics
${topicsStr}

## Description
${payload.questionContent ? payload.questionContent : '_Problem statement captured automatically by LeetLogger._'}

---

## Solution Note

Automatically committed by [LeetLogger](https://github.com/${username}/LeetLogger).
`;
  }

  /**
   * Generates the entire Root README.md containing stats, a master problem log, and topic categorization.
   */
  public static generateRootReadme(problems: ISolvedProblemMetadata[], username = 'Inkesk-Dozing'): string {
    // Sort problems by ID (numeric if possible, otherwise string fallback)
    const sortedProblems = [...problems].sort((a, b) => {
      const numA = parseInt(a.id, 10);
      const numB = parseInt(b.id, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.id.localeCompare(b.id);
    });

    // Counts
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;

    sortedProblems.forEach((p) => {
      const diff = p.difficulty.toLowerCase();
      if (diff === 'easy' || diff === 'basic' || diff === 'school') easyCount++;
      else if (diff === 'medium') mediumCount++;
      else if (diff === 'hard') hardCount++;
    });

    const total = sortedProblems.length;

    let md = `# LeetLogger Solutions Hub 🚀

Welcome to my repository containing solutions to LeetCode problems, synchronized automatically by [LeetLogger](https://github.com/${username}/LeetLogger).

---

## 📊 Dashboard

| Category | Solved Count | Badge |
| :--- | :---: | :---: |
| **Total Solved** | \`${total}\` | ![Total](https://img.shields.io/badge/Solved-${total}-blue?style=flat-square) |
| **Easy** | \`${easyCount}\` | ![Easy](https://img.shields.io/badge/Easy-${easyCount}-brightgreen?style=flat-square) |
| **Medium** | \`${mediumCount}\` | ![Medium](https://img.shields.io/badge/Medium-${mediumCount}-orange?style=flat-square) |
| **Hard** | \`${hardCount}\` | ![Hard](https://img.shields.io/badge/Hard-${hardCount}-red?style=flat-square) |

---

## 📝 Master Problem Log

| # | Title | Solution | Difficulty | Category | Platform |
| :-: | :--- | :--- | :-: | :--- | :-: |
`;

    sortedProblems.forEach((p) => {
      const dirPath = this.getDirectoryPath(p);
      const diffBadge = this.getDifficultyBadge(p.difficulty as Difficulty);
      const topicsStr = p.topics && p.topics.length > 0
        ? p.topics.map((t) => `\`${t}\``).join(', ')
        : 'General';

      const problemLink = `https://leetcode.com/problems/${p.titleSlug}/`;

      md += `| ${p.id || '-'} | [${p.title}](${problemLink}) | [Solution 📁](./${dirPath}) | ${diffBadge} | ${topicsStr} | \`LEETCODE\` |\n`;
    });

    md += `
---

## 🏷️ Topic Index

`;

    // Group by topics
    const topicMap: Record<string, ISolvedProblemMetadata[]> = {};
    sortedProblems.forEach((p) => {
      const topics = p.topics && p.topics.length > 0 ? p.topics : ['General'];
      topics.forEach((t) => {
        if (!topicMap[t]) {
          topicMap[t] = [];
        }
        topicMap[t].push(p);
      });
    });

    // Sort topics alphabetically
    const sortedTopics = Object.keys(topicMap).sort();

    sortedTopics.forEach((topic) => {
      md += `### ${topic}\n\n`;
      md += `| Problem | Solution | Difficulty |\n`;
      md += `| :--- | :--- | :-: |\n`;

      topicMap[topic].forEach((p) => {
        const dirPath = this.getDirectoryPath(p);
        const diffBadge = this.getDifficultyBadge(p.difficulty as Difficulty);
        const problemLink = `https://leetcode.com/problems/${p.titleSlug}/`;

        md += `| [${p.id ? `${p.id}. ` : ''}${p.title}](${problemLink}) | [Solution 📁](./${dirPath}) | ${diffBadge} |\n`;
      });

      md += `\n`;
    });

    md += `\n---\n\n_Logged and maintained by [${username}](https://github.com/${username}) using [LeetLogger](https://github.com/${username}/LeetLogger)._\n`;
    return md;
  }
}
