// START: DISCLAIMER BUTTON FUNCTIONALITY
document.addEventListener("DOMContentLoaded", function() {
    const agreeButton = document.getElementById("agreeButton");
    const disclaimerContainer = document.getElementById("disclaimerContainer");

    agreeButton.addEventListener("click", function() {
        disclaimerContainer.style.display = "none";
    });
});
// END: DISCLAIMER BUTTON FUNCTIONALITY

// START: MAP INITIALIZATION
document.addEventListener("DOMContentLoaded", function() {
    // Create the map and set its initial view to a neutral position and zoom
    const map = L.map('mapContainer').setView([0, 0], 13);

    // Set up the map tiles (using OpenStreetMap as the provider)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Geolocation options
    const geolocationOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
    };

    if (navigator.geolocation) {
        const geoWatchID = navigator.geolocation.watchPosition(
            function(position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                map.setView([userLat, userLng], 15);
                navigator.geolocation.clearWatch(geoWatchID);
            },
            function(error) {
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        alert("Location access denied. Unable to display current location.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Location information is unavailable. Please try again.");
                        break;
                    case error.TIMEOUT:
                        alert("Location request timed out. Please try again.");
                        break;
                    default:
                        alert("An unknown error occurred. Unable to access current location.");
                        break;
                }
            },
            geolocationOptions
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }

    // Functionality for Nominatim Suggestions and Map Centering
    const searchBox = document.getElementById("searchBox");
    const goButton = document.getElementById("goButton");
    const suggestionBox = document.createElement("div");
    suggestionBox.id = "suggestionBox";
    suggestionBox.style.position = "absolute";
    suggestionBox.style.top = "100%";
    suggestionBox.style.left = "0";
    suggestionBox.style.width = "100%";
    suggestionBox.style.backgroundColor = "white";
    suggestionBox.style.border = "1px solid #ccc";
    suggestionBox.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.1)";
    suggestionBox.style.zIndex = "9999";
    suggestionBox.style.maxHeight = "200px";
    suggestionBox.style.overflowY = "auto";
    suggestionBox.style.display = "none";
    document.getElementById("searchContainer").appendChild(suggestionBox);

    // Fetch suggestions from Nominatim as user types
    searchBox.addEventListener("input", function() {
        const query = searchBox.value;
        if (query.length > 2) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    suggestionBox.innerHTML = "";
                    
                    if (data.length > 0) {
                        suggestionBox.style.display = "block";
                        
                        data.forEach(place => {
                            const suggestionItem = document.createElement("div");
                            suggestionItem.className = "suggestion-item";
                            suggestionItem.style.padding = "10px";
                            suggestionItem.style.cursor = "pointer";
                            suggestionItem.style.fontSize = "14px";
                            suggestionItem.style.borderBottom = "1px solid #ddd";
                            suggestionItem.textContent = place.display_name;

                            suggestionItem.addEventListener("click", function() {
                                map.setView([place.lat, place.lon], 15);
                                searchBox.value = place.display_name;
                                suggestionBox.style.display = "none";
                            });

                            suggestionItem.addEventListener("mouseover", function() {
                                suggestionItem.style.backgroundColor = "#f0f0f0";
                            });
                            suggestionItem.addEventListener("mouseout", function() {
                                suggestionItem.style.backgroundColor = "white";
                            });

                            suggestionBox.appendChild(suggestionItem);
                        });
                    } else {
                        suggestionBox.style.display = "none";
                    }
                })
                .catch(error => {
                    console.error("Error fetching data from Nominatim API:", error);
                    suggestionBox.style.display = "none";
                });
        } else {
            suggestionBox.style.display = "none";
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener("click", function(event) {
        if (!searchBox.contains(event.target) && !suggestionBox.contains(event.target)) {
            suggestionBox.style.display = "none";
        }
    });

    // Event listeners for Enter key and GO button
    searchBox.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            suggestionBox.style.display = "none";
            goToLocation(searchBox.value);
        }
    });

    goButton.addEventListener("click", function() {
        suggestionBox.style.display = "none";
        goToLocation(searchBox.value);
    });

    function goToLocation(query) {
        if (query.length > 0) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.length > 0) {
                        const firstResult = data[0];
                        map.setView([firstResult.lat, firstResult.lon], 15);
                        searchBox.value = firstResult.display_name;
                    } else {
                        alert("No results found. Please refine your search.");
                    }
                })
                .catch(error => {
                    console.error("Error fetching data from Nominatim API:", error);
                    alert("There was an error retrieving the location. Please try again later.");
                });
        } else {
            alert("Please enter a location to search.");
        }
    }

    // Variables to hold the current pin marker and chosen pin icon
    let currentMarker = null;
    let selectedPinIcon = null;
    let currentPinCoordinates = null;

    // Define maximum zoom level and pin limit for the session
    const maxZoomLevel = 18;
    const maxPins = 500;
    let pinCount = 0;

    // Array to store all pins
    let pins = [];

    // Function to handle pin drop
    function handlePinDrop(e) {
        if (pinCount >= maxPins) {
            alert(`You can only drop a maximum of ${maxPins} pins per session.`);
            return;
        }

        if (map.getZoom() >= maxZoomLevel) {
            pinCount++;

            // Remove previous temporary marker if it exists
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }

            // Create a new temporary marker
            currentMarker = L.marker(e.latlng, { draggable: false }).addTo(map);
            currentPinCoordinates = e.latlng;

            // Show the display box
            const displayBox = document.getElementById("displayBox");
            displayBox.style.display = "block";
        } else {
            L.popup()
                .setLatLng(e.latlng)
                .setContent("Please zoom in fully to drop a pin.")
                .openOn(map);

            setTimeout(() => map.closePopup(), 2000);
        }
    }

    map.on('click', handlePinDrop);

    // Function to set the permanent pin icon
    function setPermanentPinIcon(iconUrl) {
        if (currentMarker) {
            const iconDiv = document.createElement('div');
            iconDiv.innerHTML = `<img src="${iconUrl}" style="width: 50px; height: 50px; transition: transform 0.5s ease; animation: pulse 1.5s infinite;">`;
            
            const style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = `
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
            `;
            document.getElementsByTagName('head')[0].appendChild(style);
    
            const customIcon = L.divIcon({
                html: iconDiv.outerHTML,
                iconSize: [50, 50],
                className: '' 
            });

            currentMarker.setIcon(customIcon);
            currentMarker.options.draggable = false;

            currentPinCoordinates = currentMarker.getLatLng();
            showTitleFields();
            
            isPinSelected = true;
            selectedPinIcon = iconUrl;
            checkSubmitButtonStatus();
        }
    }

    function showTitleFields() {
        document.getElementById("titleTextContainer").style.display = "block";
        document.getElementById("submitButton").style.display = "block";
        document.getElementById("submitButton").disabled = false; 
    }

    /// Add event listeners to set the icons with the new animation effect
    document.getElementById("displayMailboxButton").addEventListener("click", function() {
        setPermanentPinIcon('https://i.ibb.co/S3dfczG/mailbox-app-icon-removebg-preview.png');
    });

    document.getElementById("displayDogButton").addEventListener("click", function() {
        setPermanentPinIcon('https://i.ibb.co/85sX2sd/angry-dog-app-icon-removebg-preview.png');
    });

    document.getElementById("displayComfortButton").addEventListener("click", function() {
        setPermanentPinIcon('https://i.ibb.co/DDVWd8M/toilet-only-circle-app-icon-removebg-preview.png');
    });

    document.getElementById("displayHintButton").addEventListener("click", function() {
        setPermanentPinIcon('https://i.ibb.co/N1jNJJc/light-bulb-circle-app-icon-removebg-preview.png');
    });

    // Function to create a new pin
    function createPin(latlng, title, iconUrl) {
        const iconDiv = document.createElement('div');
        iconDiv.innerHTML = `<img src="${iconUrl}" style="width: 50px; height: 50px; transition: transform 0.5s ease; animation: pulse 1.5s infinite;">`;

        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }
        `;
        document.getElementsByTagName('head')[0].appendChild(style);

        const customIcon = L.divIcon({
            html: iconDiv.outerHTML,
            iconSize: [50, 50],
            className: '' 
        });

        const pinMarker = L.marker(latlng, {
            icon: customIcon
        }).addTo(map);

        const pin = {
            id: Date.now(),
            title: title,
            marker: pinMarker
        };

        const container = document.createElement('div');
        container.className = 'smallDisplayTextContainer';
        container.innerHTML = `<p><span>${pin.title}</span></p>`;
        container.style.display = 'block'; 
        document.getElementById('mapContainer').appendChild(container);

        pin.container = container;
        
        updateContainerPosition(pin);
        
        pins.push(pin);
        return pin;
    }

    // Function to update container position based on zoom level
    function updateContainerPosition(pin) {
        const zoomLevel = map.getZoom();
        const point = map.latLngToContainerPoint(pin.marker.getLatLng());

        if (zoomLevel >= 18) {
            pin.container.style.display = 'block';
            pin.container.style.left = `${point.x}px`;
            pin.container.style.top = `${point.y - 45}px`; 
            pin.container.style.transform = 'translate(-50%, -100%)';
        } else {
            pin.container.style.display = 'none';
        }
    }

    // Update all container positions when the map moves or zooms
    map.on('move zoom', function() {
        pins.forEach(updateContainerPosition);
    });

    // Submit button event listener
    document.getElementById("submitButton").addEventListener("click", function() {
        if (!this.disabled) {
            const title = document.querySelector("#titleTextContainer input").value;
            
            if (currentMarker && currentPinCoordinates && selectedPinIcon) {
                const newPin = createPin(
                    currentPinCoordinates,
                    title,
                    selectedPinIcon
                );
                
                console.log("New Pin Created:", newPin);
                
                resetDisplayBox();
                map.removeLayer(currentMarker);
                currentMarker = null;
                currentPinCoordinates = null;
                selectedPinIcon = null;
                
                updateContainerPositions(); 
                adjustPinSizes(); 
            }
        }
    });

    // Function to reset the display box
    function resetDisplayBox() {
        document.getElementById("displayBox").style.display = "none";
        document.querySelector("#titleTextContainer input").value = "";
        document.getElementById("submitButton").disabled = true;
        isPinSelected = false;
        selectedPinIcon = null;
    }

    // Close button to remove marker and hide display box
    const closeButton = document.getElementById("closeButton");
    closeButton.addEventListener("click", function() {
        if (currentMarker) {
            map.removeLayer(currentMarker);
            currentMarker = null;
        }
        currentPinCoordinates = null;
        selectedPinIcon = null;
        resetDisplayBox();
    });

    // Function to display the tag
    function showTag(name) {
        const tagDisplay = document.getElementById("tagDisplay");
        tagDisplay.textContent = name;
        tagDisplay.style.visibility = "visible";

        setTimeout(() => {
            tagDisplay.style.visibility = "hidden";
        }, 7000);
    }

    // Add event listeners to each button
    document.getElementById("displayMailboxButton").addEventListener("click", () => showTag("HIDDEN CBU/NBU | DELIVERY POINT"));
    document.getElementById("displayDogButton").addEventListener("click", () => showTag("AGGRESSIVE DOG WARNING"));
    document.getElementById("displayComfortButton").addEventListener("click", () => showTag("COMFORT STOP: BATHROOM"));
    document.getElementById("displayHintButton").addEventListener("click", () => showTag("HINT | HELP | TIP"));

    const titleInput = document.querySelector("#titleTextContainer input");
    titleInput.addEventListener("input", function() {
        if (titleInput.value.length > 15) {
            titleInput.value = titleInput.value.slice(0, 15);
        }
        checkSubmitButtonStatus();
    });
});

let isPinSelected = false;

// Function to check and update submit button
function checkSubmitButtonStatus() {
    const titleFilled = document.querySelector("#titleTextContainer input").value.length > 0;
    document.getElementById("submitButton").disabled = !(titleFilled && isPinSelected);
}

function updateContainerPositions() {
    const containers = document.querySelectorAll('.smallDisplayTextContainer');
    const containerSpacing = 10; 
    const spreadRadius = 40; 

    containers.forEach((container, index) => {
        const markerLatLng = pins[index].marker.getLatLng();
        const point = map.latLngToContainerPoint(markerLatLng);

        const angle = (index / containers.length) * Math.PI * 2; 
        const offsetX = spreadRadius * Math.cos(angle);
        const offsetY = spreadRadius * Math.sin(angle);

        container.style.left = `${point.x + offsetX}px`;
        container.style.top = `${point.y + offsetY - 45}px`; 
        container.style.transform = 'translate(-50%, -100%)';
        container.style.display = 'block';
    });
}

// Call the update function after placing each pin and on map events
map.on('move zoom', updateContainerPositions);

document.getElementById("submitButton").addEventListener("click", function() {
    if (!this.disabled) {
        const title = document.querySelector("#titleTextContainer input").value;
        
        if (currentMarker && currentPinCoordinates) {
            const newPin = createPin(
                currentPinCoordinates,
                title,
                currentMarker.getIcon().options.iconUrl
            );
            
            console.log("New Pin Created:", newPin);

            resetDisplayBox();
            map.removeLayer(currentMarker);
            currentMarker = null;
            currentPinCoordinates = null;

            updateContainerPositions(); 
        }
    }
});

// Function to dynamically resize pin icons based on the current zoom level
function adjustPinSizes() {
    const zoomLevel = map.getZoom();
    
    // Adjust this formula to make icons smaller at lower zoom levels
    let iconSize = Math.max(5, Math.min(30, 3 * (zoomLevel - 3)));

    pins.forEach(pin => {
        const currentIconUrl = pin.marker.getIcon().options.iconUrl;

        const resizedIcon = L.icon({
            iconUrl: currentIconUrl,
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize / 2, iconSize / 2]
        });

        pin.marker.setIcon(resizedIcon);
    });
}

// Call adjustPinSizes when the zoom level changes
map.on('zoomend', adjustPinSizes);

// Call adjustPinSizes initially to set the correct size based on the current zoom level
adjustPinSizes();

// Function to update container positions to prevent overlap
function updateContainerPosition(pin) {
    const point = map.latLngToContainerPoint(pin.marker.getLatLng());
    const iconSize = pin.marker.getIcon().options.iconSize[0]; // Get current icon size
    pin.container.style.left = `${point.x}px`;
    pin.container.style.top = `${point.y - iconSize / 2 - 10}px`; // Adjusted to account for icon size
    pin.container.style.transform = 'translate(-50%, -100%)';
}

// Update container positions when the map is moved or zoomed
map.on('move zoom', function() {
    pins.forEach(updateContainerPosition);
});

// Function to update all container positions
function updateContainerPositions() {
    pins.forEach(updateContainerPosition);
}

document.addEventListener("DOMContentLoaded", function () {
    let pins = [];

    // Load pins from local storage in Chrome
    function loadPins() {
        const savedPins = localStorage.getItem("pins");
        if (savedPins) {
            pins = JSON.parse(savedPins);
            pins.forEach(pinData => {
                // Restore pins to map
                const pin = createPin(pinData.latlng, pinData.title, pinData.iconUrl, false);
                pin.marker.setLatLng(pinData.latlng);  // Restore marker's position
            });
        }
    }

    // Save pins to local storage in Chrome
    function savePins() {
        localStorage.setItem("pins", JSON.stringify(pins));
    }

    // Create a new pin and store it locally
    function createPin(latlng, title, iconUrl, save = true) {
        const iconDiv = document.createElement('div');
        iconDiv.innerHTML = `<img src="${iconUrl}" style="width: 50px; height: 50px;">`;

        const customIcon = L.divIcon({
            html: iconDiv.outerHTML,
            iconSize: [50, 50],
            className: ''
        });

        const pinMarker = L.marker(latlng, {
            icon: customIcon
        }).addTo(map);

        const pin = {
            latlng: latlng,
            title: title,
            iconUrl: iconUrl,
            marker: pinMarker
        };

        // Store pin locally in the array
        pins.push(pin);

        // Save to local storage if specified
        if (save) {
            savePins();
        }

        return pin;
    }

    // Handle pin creation and saving to localStorage
    document.getElementById("submitButton").addEventListener("click", function () {
        const title = document.querySelector("#titleTextContainer input").value;

        if (currentMarker && currentPinCoordinates && selectedPinIcon) {
            // Create and save pin to local storage
            createPin(currentPinCoordinates, title, selectedPinIcon);
            resetDisplayBox();
            map.removeLayer(currentMarker);
            currentMarker = null;
            currentPinCoordinates = null;
            selectedPinIcon = null;
        }
    });

    // Load pins from local storage when the page loads
    loadPins();
});
