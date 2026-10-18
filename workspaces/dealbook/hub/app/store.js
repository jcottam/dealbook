import { api } from './util.js';

export const store = {
  posts: [],
  assets: [],
  research: { intro: null, speakers: [] },
  throughline: null,
  generatedAt: null,
  loaded: false,
  static: Boolean(globalThis.__HUB_STATIC__),

  async load() {
    if (!this.static) {
      try {
        const probe = await fetch('/api/config');
        if (probe.ok) this.static = false;
        else this.static = true;
      } catch {
        this.static = true;
      }
    }

    if (this.static) {
      const [posts, assets, research] = await Promise.all([
        fetch('/data/posts.json').then((r) => r.json()),
        fetch('/data/assets.json').then((r) => r.json()),
        fetch('/data/research.json').then((r) => r.json()),
      ]);
      Object.assign(this, {
        posts: posts.posts,
        throughline: posts.throughline,
        generatedAt: posts.generatedAt,
        assets: assets.assets,
        research,
        loaded: true,
        static: true,
      });
      return;
    }

    const [posts, assets, research] = await Promise.all([api('/api/posts'), api('/api/assets'), api('/api/research')]);
    Object.assign(this, {
      posts: posts.posts,
      throughline: posts.throughline,
      generatedAt: posts.generatedAt,
      assets: assets.assets,
      research,
      loaded: true,
      static: false,
    });
  },

  post(id) {
    return this.posts.find((p) => p.id === id);
  },

  researchFor(ids) {
    return this.research.speakers.filter((s) => ids.includes(s.id));
  },
};
