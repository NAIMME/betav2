import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  Tabs, 
  Tab, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Chip
} from '@mui/material';
import './JewelrySelector.css';

/**
 * JewelrySelector Component
 * 
 * Allows users to browse and select jewelry items for virtual try-on.
 * Includes filtering by type, material, and cultural style.
 */
const JewelrySelector = ({ 
  onSelectJewelry, 
  selectedJewelry = null,
  culturalStyle = 'western'
}) => {
  // State for jewelry items and filters
  const [jewelryItems, setJewelryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [jewelryType, setJewelryType] = useState('all');
  const [metalType, setMetalType] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState(culturalStyle);
  
  // Fetch jewelry items from API or mock data
  useEffect(() => {
    // In a real app, this would be an API call
    // For now, we'll use mock data
    setLoading(true);
    
    // Simulating API delay
    setTimeout(() => {
      try {
        const mockJewelryData = getMockJewelryData();
        setJewelryItems(mockJewelryData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load jewelry items');
        setLoading(false);
      }
    }, 500);
  }, [selectedStyle]);
  
  // Handle jewelry type filter change
  const handleTypeChange = (event, newValue) => {
    setJewelryType(newValue);
  };
  
  // Handle metal type filter change
  const handleMetalChange = (event) => {
    setMetalType(event.target.value);
  };
  
  // Handle cultural style change
  const handleStyleChange = (event) => {
    setSelectedStyle(event.target.value);
  };
  
  // Handle jewelry item selection
  const handleSelectJewelry = (item) => {
    if (onSelectJewelry) {
      onSelectJewelry(item);
    }
  };
  
  // Filter jewelry items based on current filters
  const filteredJewelryItems = jewelryItems.filter(item => {
    return (
      (jewelryType === 'all' || item.type === jewelryType) &&
      (metalType === 'all' || item.metalType === metalType) &&
      (item.culturalStyle === selectedStyle)
    );
  });
  
  return (
    <Box className="jewelry-selector-container">
      <Typography variant="h6" gutterBottom>
        Select Jewelry
      </Typography>
      
      {/* Jewelry Type Filter Tabs */}
      <Tabs
        value={jewelryType}
        onChange={handleTypeChange}
        variant="scrollable"
        scrollButtons="auto"
        className="jewelry-type-tabs"
      >
        <Tab value="all" label="All" />
        <Tab value="earring" label="Earrings" />
        <Tab value="necklace" label="Necklaces" />
        <Tab value="ring" label="Rings" />
        <Tab value="bracelet" label="Bracelets" />
        <Tab value="watch" label="Watches" />
      </Tabs>
      
      {/* Filter Controls */}
      <Box className="jewelry-filter-controls">
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="metal-type-label">Metal</InputLabel>
          <Select
            labelId="metal-type-label"
            id="metal-type-select"
            value={metalType}
            onChange={handleMetalChange}
            label="Metal"
          >
            <MenuItem value="all">All Metals</MenuItem>
            <MenuItem value="gold">Gold</MenuItem>
            <MenuItem value="silver">Silver</MenuItem>
            <MenuItem value="platinum">Platinum</MenuItem>
            <MenuItem value="rosegold">Rose Gold</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="cultural-style-label">Style</InputLabel>
          <Select
            labelId="cultural-style-label"
            id="cultural-style-select"
            value={selectedStyle}
            onChange={handleStyleChange}
            label="Style"
          >
            <MenuItem value="western">Western</MenuItem>
            <MenuItem value="indian">Indian</MenuItem>
            <MenuItem value="asian">Asian</MenuItem>
            <MenuItem value="middle-eastern">Middle Eastern</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      {/* Jewelry Items Grid */}
      {loading ? (
        <Box className="jewelry-loading">
          <Typography>Loading jewelry...</Typography>
        </Box>
      ) : error ? (
        <Box className="jewelry-error">
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <Grid container spacing={2} className="jewelry-grid">
          {filteredJewelryItems.map((item) => (
            <Grid item xs={6} sm={4} md={3} key={item.id}>
              <Card 
                className={`jewelry-item-card ${selectedJewelry?.id === item.id ? 'selected' : ''}`}
                onClick={() => handleSelectJewelry(item)}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={item.thumbnail}
                  alt={item.name}
                />
                <CardContent>
                  <Typography variant="subtitle2" noWrap>
                    {item.name}
                  </Typography>
                  <Box className="jewelry-item-tags">
                    <Chip 
                      size="small" 
                      label={item.metalType} 
                      className={`metal-${item.metalType}`}
                    />
                    {item.gemstones && item.gemstones.length > 0 && (
                      <Chip 
                        size="small" 
                        label={item.gemstones[0]} 
                        className="gem-chip"
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          
          {filteredJewelryItems.length === 0 && (
            <Box className="no-results">
              <Typography align="center">
                No jewelry items match the selected filters.
              </Typography>
            </Box>
          )}
        </Grid>
      )}
    </Box>
  );
};

/**
 * Mock jewelry data for demonstration
 */
const getMockJewelryData = () => {
  return [
    {
      id: 'e1',
      name: 'Diamond Stud Earrings',
      type: 'earring',
      metalType: 'gold',
      gemstones: ['diamond'],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/diamond-studs.jpg',
      modelPath: '/models/jewelry/earrings/diamond-studs.glb',
      leftImageUrl: '/models/jewelry/images/diamond-stud-left.png',
      rightImageUrl: '/models/jewelry/images/diamond-stud-right.png',
      sizeAdjustment: 1.0
    },
    {
      id: 'e2',
      name: 'Gold Hoop Earrings',
      type: 'earring',
      metalType: 'gold',
      gemstones: [],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/gold-hoops.jpg',
      modelPath: '/models/jewelry/earrings/gold-hoops.glb',
      leftImageUrl: '/models/jewelry/images/gold-hoop-left.png',
      rightImageUrl: '/models/jewelry/images/gold-hoop-right.png',
      sizeAdjustment: 1.2
    },
    {
      id: 'e3',
      name: 'Jhumka Earrings',
      type: 'earring',
      metalType: 'gold',
      gemstones: ['ruby', 'emerald'],
      culturalStyle: 'indian',
      thumbnail: '/models/jewelry/thumbnails/jhumka.jpg',
      modelPath: '/models/jewelry/earrings/jhumka.glb',
      leftImageUrl: '/models/jewelry/images/jhumka-left.png',
      rightImageUrl: '/models/jewelry/images/jhumka-right.png',
      sizeAdjustment: 1.3
    },
    {
      id: 'n1',
      name: 'Diamond Pendant Necklace',
      type: 'necklace',
      metalType: 'silver',
      gemstones: ['diamond'],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/diamond-pendant.jpg',
      modelPath: '/models/jewelry/necklaces/diamond-pendant.glb',
      imageUrl: '/models/jewelry/images/diamond-pendant.png',
      sizeAdjustment: 1.0
    },
    {
      id: 'n2',
      name: 'Gold Chain Necklace',
      type: 'necklace',
      metalType: 'gold',
      gemstones: [],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/gold-chain.jpg',
      modelPath: '/models/jewelry/necklaces/gold-chain.glb',
      imageUrl: '/models/jewelry/images/gold-chain.png',
      sizeAdjustment: 1.0
    },
    {
      id: 'n3',
      name: 'Kundan Necklace',
      type: 'necklace',
      metalType: 'gold',
      gemstones: ['ruby', 'emerald'],
      culturalStyle: 'indian',
      thumbnail: '/models/jewelry/thumbnails/kundan-necklace.jpg',
      modelPath: '/models/jewelry/necklaces/kundan.glb',
      imageUrl: '/models/jewelry/images/kundan-necklace.png',
      sizeAdjustment: 1.2
    },
    {
      id: 'r1',
      name: 'Diamond Solitaire Ring',
      type: 'ring',
      metalType: 'platinum',
      gemstones: ['diamond'],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/diamond-ring.jpg',
      modelPath: '/models/jewelry/rings/diamond-solitaire.glb',
      imageUrl: '/models/jewelry/images/diamond-ring.png',
      fingerIndex: 3, // Ring finger
      sizeAdjustment: 1.0,
      preferredHand: 'left'
    },
    {
      id: 'r2',
      name: 'Gold Band Ring',
      type: 'ring',
      metalType: 'gold',
      gemstones: [],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/gold-band.jpg',
      modelPath: '/models/jewelry/rings/gold-band.glb',
      imageUrl: '/models/jewelry/images/gold-band.png',
      fingerIndex: 3, // Ring finger
      sizeAdjustment: 1.0,
      preferredHand: 'left'
    },
    {
      id: 'b1',
      name: 'Silver Charm Bracelet',
      type: 'bracelet',
      metalType: 'silver',
      gemstones: [],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/charm-bracelet.jpg',
      modelPath: '/models/jewelry/bracelets/charm-bracelet.glb',
      imageUrl: '/models/jewelry/images/charm-bracelet.png',
      sizeAdjustment: 1.0,
      preferredHand: 'right'
    },
    {
      id: 'b2',
      name: 'Gold Bangle',
      type: 'bracelet',
      metalType: 'gold',
      gemstones: [],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/gold-bangle.jpg',
      modelPath: '/models/jewelry/bracelets/gold-bangle.glb',
      imageUrl: '/models/jewelry/images/gold-bangle.png',
      sizeAdjustment: 1.0,
      preferredHand: 'right'
    },
    {
      id: 'w1',
      name: 'Classic Analog Watch',
      type: 'watch',
      metalType: 'silver',
      gemstones: [],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/analog-watch.jpg',
      modelPath: '/models/jewelry/watches/analog-watch.glb',
      imageUrl: '/models/jewelry/images/analog-watch.png',
      sizeAdjustment: 1.0,
      preferredHand: 'left'
    },
    {
      id: 'w2',
      name: 'Gold Luxury Watch',
      type: 'watch',
      metalType: 'gold',
      gemstones: [],
      culturalStyle: 'western',
      thumbnail: '/models/jewelry/thumbnails/luxury-watch.jpg',
      modelPath: '/models/jewelry/watches/luxury-watch.glb',
      imageUrl: '/models/jewelry/images/luxury-watch.png',
      sizeAdjustment: 1.0,
      preferredHand: 'left'
    }
  ];
};

export default JewelrySelector;