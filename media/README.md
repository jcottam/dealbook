# Media library (local only)

Put calendar delivery folders here. Each post typically has its own directory:

```
media/
  Post 1 - History/
  Post 2 - Elon Musk/
  …
```

Optional legacy layout (year / speaker) also works under this root:

```
media/
  2023/
    Elon_Musk/
      …
```

Files in this tree are **not** committed to Git (see root `.gitignore`). Point the hub at this folder via **Settings → Media root** (`media` by default in `hub.config.json`) or run `pnpm hub:legacy:start` after cloning.

Finished cuts often live in `_finished/`, `finished/`, or `delivery/` subfolders inside a post directory.
