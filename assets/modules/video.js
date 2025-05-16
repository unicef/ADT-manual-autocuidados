// video.js

import { state, setState } from './state.js';

export const stopSLVideo = () => {
    const videoContainer = document.getElementById('sign-language-video');
    const video = state.videoElement;
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
    videoContainer.classList.add('hidden');
    setState('videoPlaying', false);
};

export const startSLVideo = () => {
    const videoContainer = document.getElementById('sign-language-video');

    // Remove the existing video element if it exists
    const existingVideo = videoContainer.querySelector('video');
    if (existingVideo) {
        existingVideo.remove();
    }

    if (!state.videoSource) {
        return;
    }
    const videoUrl = state.videoSource;
    // Use loadSLVideoWithPromise to load the video
    loadSLVideoWithPromise(videoUrl)
        .then((video) => {
            // Append the new video element to the container
            videoContainer.appendChild(video);

            // Attempt to play the video
            video.play()
                .then(() => {
                    // Video is playing successfully
                    videoContainer.classList.remove('hidden');
                    setState('videoPlaying', true);
                })
                .catch((error) => {
                    // Handle play() error
                    console.warn('Video playback failed:', error);
                });
        })
        .catch((error) => {
            console.error('Failed to start the video:', error);
        });
};

/**
 * Load a sign language video with a promise
 * @param {string} src - The source URL of the video
 * @returns {Promise<HTMLVideoElement>} - Resolves with the video element when loaded
 */
export const loadSLVideoWithPromise = (src) => {
    return new Promise((resolve, reject) => {
        // Create a new video element
        const video = document.createElement('video');
        video.src = src;
        video.controls = true;
        video.autoplay = true;

        // Add the specified classes
        video.classList.add('w-full', 'h-full', 'object-cover');

        // Update the state with the new video element
        setState('videoElement', video);

        // Handle video events
        video.onloadeddata = () => {
            resolve(video); // Resolve the promise with the video element when loaded
        };

        video.onerror = () => {
            console.warn(`Error loading video: ${src}. Falling back to default video.`);
            video.src = "video/10_0.mp4"; // Set the default video source
            video.load(); // Reload the video with the new source

            // Handle the fallback video loading
            video.onloadeddata = () => {
                resolve(video); // Resolve the promise with the fallback video
            };

            video.onerror = (error) => {
                console.error('Error loading fallback video:', error);
                reject(error); // Reject the promise if the fallback video also fails
            };
        };
    });
};

export const loadCurrentSLVideo = () => {
    const videoFiles = state.videoFiles;
    const currentPage = state.currentPage.replace(/_/g, '-');
    state.videoSource = videoFiles["video-" + currentPage];
}

// Create or remove the bottom container for sign language
export const toggleBottomContainer = (show) => {
    const existingContainer = document.getElementById('sign-language-bottom-container');
    
    if (show) {
        // Create the container if it doesn't exist
        if (!existingContainer) {
            const container = document.createElement('div');
            container.id = 'sign-language-bottom-container';
            container.style.height = '300px';
            container.style.width = '100%';
            //container.style.backgroundColor = '#f0f0f0';
            container.style.position = 'fixed';
            container.style.bottom = '0';
            container.style.left = '0';
            container.style.zIndex = '40';
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
            //container.style.borderTop = '1px solid #ddd';
            
            // Move the existing video container into this one if needed
            const videoContainer = document.getElementById('sign-language-video');
            if (videoContainer) {
                container.appendChild(videoContainer);
            } else {
                container.innerHTML = '<div id="sign-language-video" class="w-full h-full"></div>';
            }
            
            document.body.appendChild(container);
            
            // Add padding to the bottom of the body to prevent content from being hidden
            document.body.style.paddingBottom = '300px';
        }
    } else {
        // Remove the container if it exists
        if (existingContainer) {
            // Move the video container back to its original location if needed
            const videoContainer = document.getElementById('sign-language-video');
            if (videoContainer) {
                document.body.appendChild(videoContainer);
            }
            
            existingContainer.remove();
            document.body.style.paddingBottom = '0';
        }
    }
}