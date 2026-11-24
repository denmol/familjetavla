import { describe, expect, it } from "vitest";
import { parseVklassNews, vklassPublished } from "./connectors/vklass.js";

// Shaped like the custodian start page in screenshots (names made up).
const html = `<html><body>
<div class="vk-student-card"><h2>Kim</h2><div class="vk-student-card__day"><h3>Idag</h3><ul><li>Fisk</li></ul></div></div>
<section class="news">
  <div class="news-item">
    <div class="row"><h2 class="title">Höstlov på biblioteket</h2><span class="circle">KI</span></div>
    <div class="meta"><span>Skolan 1-6 och <a href="#">2 till</a></span></div>
    <div class="meta"><span>Personal, elever och vårdnadshavare</span></div>
    <div class="body"><p>Välkommen till biblioteket på höstlovet!</p><p>Vi kör pärlcraft och workshop.</p></div>
    <div class="published">Publicerat 20 oktober 13:50 av Lärare Exempel</div>
    <div class="attachments"><h5>Länkat material</h5><a href="/Files/Download/2F07F3F5-E579-4DD9-9370-71ABCDEF0123">Höstlov affisch</a></div>
  </div>
  <div class="news-item">
    <div class="row"><h2 class="title">Presentation från mötet</h2><span class="circle">AL</span></div>
    <div class="body">Enligt önskemål kommer här presentationen.<br>Hälsningar</div>
    <div class="published">Publicerat 14 oktober 09:05 av Rektor</div>
  </div>
</section></body></html>`;

describe("Vklass news", () => {
  it("reads title, text, date, badge and files, without meta lines", () => {
    const news = parseVklassNews(html, new Date(2026, 9, 20, 15));
    expect(news.map((n) => n.title)).toEqual(["Höstlov på biblioteket", "Presentation från mötet"]);
    const [a, b] = news;
    expect(a.text).toBe("Välkommen till biblioteket på höstlovet!\nVi kör pärlcraft och workshop.");
    expect(a.badge).toBe("KI");
    expect(a.files).toEqual([{ name: "Höstlov affisch", url: "https://custodian.vklass.se/Files/Download/2F07F3F5-E579-4DD9-9370-71ABCDEF0123" }]);
    expect(new Date(a.published!).getMonth()).toBe(9);
    expect(b.text).toContain("Enligt önskemål");
    expect(b.files).toEqual([]);
    expect(a.id).not.toBe(b.id);
  });

  it("dates without a year that would be in the future are last year", () => {
    expect(new Date(vklassPublished("28 december 10:00", new Date(2027, 0, 3))!).getFullYear()).toBe(2026);
  });
});

describe("Vklass news page data", () => {
  it("reads newsArticles from the page script, with files and plain text", async () => {
    const { parseVklassNewsData } = await import("./connectors/vklass.js");
    const page = `<html><script>Vue.component("news", { data: () => ({ newsArticles: [] }) });</script><script>var vm = new Vue({ data: { initialNewsId: 0, newsArticles: [
      {"id": 4711, "title": "Höstlov på biblioteket", "publishDate": "2026-10-20T13:50:00", "publishEndDate": null, "tags": [{"name": "Skolan 1-6"}],
       "authorName": "X", "imagePath": null, "introText": "Välkommen till biblioteket!", "text": "<p>Välkommen till biblioteket!</p><p>Vi kör \\"pärlcraft\\" [och] {workshop}.</p>",
       "files": [{"iconName": "pdf", "name": "Affisch", "nameWithExtension": "Affisch.pdf", "fileName": "2F07.pdf", "extension": ".pdf", "accessToken": "t", "url": "/File/Download/2F07?token=t", "uploadedDate": "2026-10-20"}]},
      {"id": 4712, "title": "Presentation", "publishDate": "2026-10-14T09:05:00", "introText": "", "text": "Enligt önskemål.", "files": []}
    ] } });</script></html>`;
    const n = parseVklassNewsData(page);
    expect(n.map((x) => x.id)).toEqual(["4711", "4712"]);
    expect(n[0].text).toBe('Välkommen till biblioteket!\nVi kör "pärlcraft" [och] {workshop}.');
    expect(n[0].files).toEqual([{ name: "Affisch.pdf", url: "https://custodian.vklass.se/File/Download/2F07?token=t" }]);
    expect(n[0].tags).toEqual(["Skolan 1-6"]);
    expect(n[1].text).toBe("Enligt önskemål.");
  });
});

describe("Vklass ServerHtml model", () => {
  it("reads the news model passed as a JavaScript string", async () => {
    const { parseVklassNewsData } = await import("./connectors/vklass.js");
    const json = JSON.stringify({
      initialNewsId: null,
      newsArticles: [{ id: 4828277, title: "Höstlov på biblioteket", publishDate: "2026-10-20", tags: ["Skolan 1-6", "Annan skola"], introText: "Välkommen!", text: "<p>Kom och levla upp lovet – det är 'gratis'!</p>", files: [{ name: "Affisch", nameWithExtension: "Affisch.jpg", url: "/File/x?t=1" }] }],
    });
    const js = json.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const page = `<vkau-news-article repeat.for="article of data.newsArticles"></vkau-news-article><script>ServerHtml('TTJQ', 'common/views/shared/display-templates/news-feed-model/news-feed-model', '${js}');</script>`;
    const n = parseVklassNewsData(page);
    expect(n).toHaveLength(1);
    expect(n[0].title).toBe("Höstlov på biblioteket");
    expect(n[0].text).toBe("Välkommen!\n\nKom och levla upp lovet – det är 'gratis'!");
    expect(n[0].files[0]).toEqual({ name: "Affisch.jpg", url: "https://custodian.vklass.se/File/x?t=1" });
    expect(n[0].tags).toEqual(["Skolan 1-6", "Annan skola"]);
  });
});

describe("links written in a Vklass news text", () => {
  it("become files to open, without duplicates", async () => {
    const { parseVklassNewsData } = await import("./connectors/vklass.js");
    const json = JSON.stringify({
      newsArticles: [
        {
          id: 1,
          title: "Veckobrev",
          publishDate: "2026-10-23",
          text: '<p>Här är veckobrevet: <a href="/File/Download/9?t=a">Ladda ner veckobrevet</a> och <a href="https://forms.example.se/anmalan">anmälan</a>.</p><p><a href="/File/Download/9?t=a">igen</a> <a href="mailto:x@y.se">mejl</a></p>',
          files: [],
        },
      ],
    });
    const js = json.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const n = parseVklassNewsData(`<script>ServerHtml('A', 'x/news-feed-model', '${js}');</script>`);
    expect(n[0].files).toEqual([
      { name: "Ladda ner veckobrevet", url: "https://custodian.vklass.se/File/Download/9?t=a" },
      { name: "anmälan", url: "https://forms.example.se/anmalan" },
    ]);
    expect(n[0].text).toContain("Här är veckobrevet");
  });
});
