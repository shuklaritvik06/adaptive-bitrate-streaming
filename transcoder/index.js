const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3({
    region: 'us-west-2'
});

const bucketName = 'web-streamer-ritvik';
const outputBucketName = 'transformed-videos-streamer-ritvik';

const resolutions = [
    { name: '240p', width: 426, height: 240, bitrate: 400000, avgBitrate: 350000 },
    { name: '360p', width: 640, height: 360, bitrate: 800000, avgBitrate: 700000 },
    { name: '480p', width: 854, height: 480, bitrate: 1400000, avgBitrate: 1300000 },
    { name: '720p', width: 1280, height: 720, bitrate: 2800000, avgBitrate: 2500000 },
    { name: '1080p', width: 1920, height: 1080, bitrate: 5000000, avgBitrate: 4500000 },
];

const downloadFromS3 = async (uuid) => {
    const key = `${uuid}/video_${uuid}.mp4`;
    const localVideoPath = `/tmp/${uuid}.mp4`;

    const params = {
        Bucket: bucketName,
        Key: key
    };

    const file = fs.createWriteStream(localVideoPath);
    return new Promise((resolve, reject) => {
        s3.getObject(params).createReadStream().pipe(file)
            .on('finish', () => resolve(localVideoPath))
            .on('error', reject);
    });
};

const uploadToS3 = async (filePath, targetKey) => {
    const fileContent = fs.readFileSync(filePath);
    const params = {
        Bucket: outputBucketName,
        Key: targetKey,
        Body: fileContent
    };
    return s3.upload(params).promise();
};

const processVideo = (inputPath, outputDir, resolution, uuid) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .audioBitrate(resolution.name === '360p' ? 96 : 128)
            .size(`${resolution.width}x${resolution.height}`)
            .outputOptions([
                '-hls_time 10',
                '-preset ultrafast',
                '-hls_playlist_type vod',
                `-hls_base_url ${process.env.STREAM_URL}/${uuid}/`,
                `-hls_segment_filename ${outputDir}/${resolution.name}_%03d.ts`
            ])
            .output(`${outputDir}/${resolution.name}.m3u8`)
            .on('progress', function(progress) {
                console.log(`Processing ${resolution.name}: ${progress.percent}% done`);
            })
            .on('end', function() {
                console.log(`Finished processing ${resolution.name}!`);
                resolve(resolution.name);
            })
            .on('error', function(err) {
                console.error(`Error processing video ${resolution.name}:`, err);
                reject(err);
            })
            .run();
    });
};

const createMasterPlaylist = async (uuid, outputDir) => {
    const masterPlaylistPath = `${outputDir}/master.m3u8`;
    const masterPlaylistContent = resolutions.map(resolution => {
        return `#EXT-X-STREAM-INF:BANDWIDTH=${resolution.bitrate},AVERAGE-BANDWIDTH=${resolution.avgBitrate},RESOLUTION=${resolution.width}x${resolution.height}\n${resolution.name}.m3u8`;
    }).join('\n');

    fs.writeFileSync(masterPlaylistPath, masterPlaylistContent);
    console.log('Master playlist created successfully!');
    return masterPlaylistPath;
};

const transcodeVideo = async (uuid) => {
    const localVideoPath = `/tmp/${uuid}.mp4`;
    const outputDir = `/tmp/${uuid}_output`;
    try {
        console.log('Downloading video from S3...');
        await downloadFromS3(uuid);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        for (const resolution of resolutions) {
            console.log(`Processing video at ${resolution.name}...`);
            await processVideo(localVideoPath, outputDir, resolution, uuid);
        }
        console.log('Creating master playlist...');
        await createMasterPlaylist(uuid, outputDir);
        console.log('Uploading HLS files to S3...');
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
            const filePath = path.join(outputDir, file);
            const s3Key = `${uuid}/${file}`;
            await uploadToS3(filePath, s3Key);
        }
        console.log('All files uploaded successfully!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (fs.existsSync(localVideoPath)) {
            fs.unlinkSync(localVideoPath);
            fs.rmSync(outputDir, { recursive: true, force: true });
        }
    }
};

const uuid = process.env.UUID_TO_PROCESS;
transcodeVideo(uuid).then(()=>{
    console.log("Video is transcoded")
}).catch((err)=>{
    console.log(err)
});
