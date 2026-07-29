import express from "express";
import fetch from "node-fetch";
import { HttpError } from "../utils/utils";
import findPost from "../utils/fetch/findPost";
import renderSeo from "../utils/renderSeo";
const router = express.Router();

// ponytail: Chrome UA gets 200 w/o Location on /share — use simple UA for 302
async function threadsSharePostId(shareId: string): Promise<string | null> {
  const shareUrl = `https://www.threads.com/share/${shareId}/`;
  const headers = { "User-Agent": "Mozilla/5.0" };

  const shareRes = await fetch(shareUrl, { redirect: "manual", headers });
  const loc = shareRes.headers.get("location") || "";
  let m = loc.match(/\/post\/([^/?#]+)/);
  if (m) return m[1];

  const followed = await fetch(shareUrl, { redirect: "follow", headers });
  m = followed.url.match(/\/post\/([^/?#]+)/);
  return m ? m[1] : null;
}

router.get("/share/:shareId", async (req, res, next) => {
  try {
    if (!req.params.shareId) return next(new HttpError(400, "No share id provided"));

    const postId = await threadsSharePostId(req.params.shareId);
    if (!postId) return next(new HttpError(404, "Post not found"));

    const post = await findPost({
      post: postId,
      userAgent: req.headers["user-agent"] || "",
    });
    if (!post || !post.title) {
      return next(new HttpError(404, "Post not found"));
    }

    return res.send(
      renderSeo({
        type: "post",
        content: post,
      })
    );
  } catch (e: any) {
    res.status(500).json({
      error: true,
      message: e.message,
    });
  }
});

router.get("/t/:post", async (req, res, next) => {
  try {
    if (!req.params.post) return next(new HttpError(400, "No post provided"));

    const post = await findPost({
      post: req.params.post,
      userAgent: req.headers["user-agent"] || "",
    });
    if (!post || !post.title) {
      return next(new HttpError(404, "Post not found"));
    }

    return res.send(
      renderSeo({
        type: "post",
        content: post,
      })
    );
  } catch (e: any) {
    res.status(500).json({
      error: true,
      message: e.message,
    });
  }
});

router.get("/:username/post/:post", async (req, res, next) => {
  try {
    if (!req.params.post) return next(new HttpError(400, "No post provided"));

    const post = await findPost({
      post: req.params.post,
      userAgent: req.headers["user-agent"] || "",
    });
    if (!post || !post.title) {
      return next(new HttpError(404, "Post not found"));
    }

    const seo = renderSeo({
      type: "post",
      content: post,
    });

    return res.send(seo);
  } catch (e: any) {
    res.status(500).json({
      error: true,
      message: e.message,
    });
  }
});

export default router;
