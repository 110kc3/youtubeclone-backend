const { Op } = require("sequelize");
var cloudinary = require("cloudinary").v2;
const {
  User,
  Video,
  VideoLike,
  Comment,
  View,
  Subscription,
} = require("../sequelize");
const asyncHandler = require("../middlewares/asyncHandler");
const FastSpeedtest = require("fast-speedtest-api");

let speedtest = new FastSpeedtest({
  token: "YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm", // required
  verbose: false, // default: false
  timeout: 2000, // default: 5000
  https: true, // default: true
  urlCount: 2, // default: 5
  bufferSize: 1, // default: 8
  unit: FastSpeedtest.UNITS.Mbps, // default: Bps
});

exports.newVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.create({
    ...req.body,
    userId: req.user.id,
    bitrate: req.body.bitrate,
  });

  res.status(200).json({ success: true, data: video });
});

exports.getSpeed = asyncHandler(async (req, res, next) => {
  //SPEED TEST NA PCOZATKU PUSZCZANIA FILMU
  const speed = await speedtest.getSpeed();
  console.log("Network speed: " + speed);

  res.status(200).json({ success: true, data: speed });
});

exports.getBitrate = asyncHandler(async (req, res, next) => {
  const video = await Video.findByPk(req.params.id);
  if (!video) {
    return next({
      message: `No video found for ID - ${req.params.id}`,
      statusCode: 404,
    });
  }

  const bitrate = video.bitrate;

  res.status(200).json({ success: true, data: bitrate });
});

exports.getVideo = asyncHandler(async (req, res, next) => {
  //SPEED TEST NA PCOZATKU PUSZCZANIA FILMU
  const speed = await speedtest.getSpeed();
  console.log("Network speed: " + speed);

  const video = await Video.findByPk(req.params.id, {
    include: [
      {
        model: User,
        attributes: ["id", "username", "avatar"],
      },
    ],
  });

  if (!video) {
    return next({
      message: `No video found for ID - ${req.params.id}`,
      statusCode: 404,
    });
  }

  const comments = await video.getComments({
    order: [["createdAt", "DESC"]],
    attributes: ["id", "text", "createdAt"],
    include: [
      {
        model: User,
        attributes: ["id", "username", "avatar"],
      },
    ],
  });

  const isLiked = await VideoLike.findOne({
    where: {
      [Op.and]: [
        { videoId: req.params.id },
        { userId: req.user.id },
        { like: 1 },
      ],
    },
  });

  const isDisliked = await VideoLike.findOne({
    where: {
      [Op.and]: [
        { videoId: req.params.id },
        { userId: req.user.id },
        { like: -1 },
      ],
    },
  });

  const commentsCount = await Comment.count({
    where: {
      videoId: req.params.id,
    },
  });

  const likesCount = await VideoLike.count({
    where: {
      [Op.and]: [{ videoId: req.params.id }, { like: 1 }],
    },
  });

  const dislikesCount = await VideoLike.count({
    where: {
      [Op.and]: [{ videoId: req.params.id }, { like: -1 }],
    },
  });

  const views = await View.count({
    where: {
      videoId: req.params.id,
    },
  });

  const isSubscribed = await Subscription.findOne({
    where: {
      subscriber: req.user.id,
      subscribeTo: video.userId,
    },
  });

  const isViewed = await View.findOne({
    where: {
      userId: req.user.id,
      videoId: video.id,
    },
  });

  const subscribersCount = await Subscription.count({
    where: { subscribeTo: video.userId },
  });

  const isVideoMine = req.user.id === video.userId;

  console.log(video);

  let new_url = video.dataValues.url.split("/");
  let a = [];

  let quality = "q_100";

  for (let i = 0; i <= new_url.length; i++) {
    if (i === 6) {
      a.push(quality);
    } else if (i < 6) {
      a.push(new_url[i]);
    } else if (i > 6) {
      a.push(new_url[i - 1]);
    }
  }
  // likesCount, disLikesCount, views
  video.setDataValue("comments", comments);
  video.setDataValue("commentsCount", commentsCount);
  video.setDataValue("isLiked", !!isLiked);
  video.setDataValue("isDisliked", !!isDisliked);
  video.setDataValue("url", a.join("/"));
  video.setDataValue("likesCount", likesCount);
  video.setDataValue("dislikesCount", dislikesCount);
  video.setDataValue("views", views);
  video.setDataValue("isVideoMine", isVideoMine);
  video.setDataValue("isSubscribed", !!isSubscribed);
  video.setDataValue("isViewed", !!isViewed);
  video.setDataValue("subscribersCount", subscribersCount);
  video.setDataValue("duration", video.dataValues.duration);

  res.status(200).json({ success: true, data: video });
});

exports.likeVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findByPk(req.params.id);

  if (!video) {
    return next({
      message: `No video found for ID - ${req.params.id}`,
      statusCode: 404,
    });
  }

  const liked = await VideoLike.findOne({
    where: {
      userId: req.user.id,
      videoId: req.params.id,
      like: 1,
    },
  });

  const disliked = await VideoLike.findOne({
    where: {
      userId: req.user.id,
      videoId: req.params.id,
      like: -1,
    },
  });

  if (liked) {
    await liked.destroy();
  } else if (disliked) {
    disliked.like = 1;
    await disliked.save();
  } else {
    await VideoLike.create({
      userId: req.user.id,
      videoId: req.params.id,
      like: 1,
    });
  }

  res.json({ success: true, data: {} });
});

exports.dislikeVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findByPk(req.params.id);

  if (!video) {
    return next({
      message: `No video found for ID - ${req.params.id}`,
      statusCode: 404,
    });
  }

  const liked = await VideoLike.findOne({
    where: {
      userId: req.user.id,
      videoId: req.params.id,
      like: 1,
    },
  });

  const disliked = await VideoLike.findOne({
    where: {
      userId: req.user.id,
      videoId: req.params.id,
      like: -1,
    },
  });

  if (disliked) {
    await disliked.destroy();
  } else if (liked) {
    liked.like = -1;
    await liked.save();
  } else {
    await VideoLike.create({
      userId: req.user.id,
      videoId: req.params.id,
      like: -1,
    });
  }

  res.json({ success: true, data: {} });
});

exports.addComment = asyncHandler(async (req, res, next) => {
  const video = await Video.findByPk(req.params.id);

  if (!video) {
    return next({
      message: `No video found for ID - ${req.params.id}`,
      statusCode: 404,
    });
  }

  const comment = await Comment.create({
    text: req.body.text,
    userId: req.user.id,
    videoId: req.params.id,
  });

  const User = {
    id: req.user.id,
    avatar: req.user.avatar,
    username: req.user.username,
  };

  comment.setDataValue("User", User);

  res.status(200).json({ success: true, data: comment });
});

exports.newView = asyncHandler(async (req, res, next) => {
  const video = await Video.findByPk(req.params.id);

  if (!video) {
    return next({
      message: `No video found for ID - ${req.params.id}`,
      statusCode: 404,
    });
  }

  const viewed = await View.findOne({
    where: {
      userId: req.user.id,
      videoId: req.params.id,
    },
  });

  if (viewed) {
    return next({ message: "You already viewed this video", statusCode: 400 });
  }

  await View.create({
    userId: req.user.id,
    videoId: req.params.id,
  });

  res.status(200).json({ success: true, data: {} });
});

exports.searchVideo = asyncHandler(async (req, res, next) => {
  if (!req.query.searchterm) {
    return next({ message: "Please enter the searchterm", statusCode: 400 });
  }

  const videos = await Video.findAll({
    include: { model: User, attributes: ["id", "avatar", "username"] },
    where: {
      [Op.or]: {
        title: {
          [Op.substring]: req.query.searchterm,
        },
        description: {
          [Op.substring]: req.query.searchterm,
        },
      },
    },
  });

  if (!videos.length)
    return res.status(200).json({ success: true, data: videos });

  videos.forEach(async (video, index) => {
    const views = await View.count({ where: { videoId: video.id } });
    video.setDataValue("views", views);

    if (index === videos.length - 1) {
      return res.status(200).json({ success: true, data: videos });
    }
  });
});
