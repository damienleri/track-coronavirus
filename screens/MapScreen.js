import React, { Component } from "react";
import moment from "moment";
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TouchableHighlight,
  Keyboard,
  AppState,
  SafeAreaView
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import _ from "lodash";
import Papa from "papaparse";
import { Ionicons } from "@expo/vector-icons";
import { googleApiKey } from "../configs";
import { mapStyle, defaultCoordinates } from "../constants";
import Link from "../components/Link";
import SocialShare from "../components/SocialShare";

export default class Passenger extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      latitude: 0,
      longitude: 0,
      locationPredictions: [],
      zoomedOut: true
    };
    this.onChangeDestinationDebounced = _.debounce(
      this.onChangeDestination,
      300
    );
  }

  componentDidMount() {
    AppState.addEventListener("change", this.loadCases);
    this.loadCases();
  }

  componentWillUnmount() {
    AppState.removeEventListener("change", this.loadCases);
  }

  centerOnCurrentLocation = async () => {
    navigator.geolocation.getCurrentPosition(
      position => {
        this.setState({
          zoomedOut: false,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      error => this.setState({ error: error.message }),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
  };

  getCsvForDate = async date => {
    const url = `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/${date.format(
      "MM-DD-YYYY"
    )}.csv`;
    const result = await fetch(url);
    if (!result.ok) return;
    return await result.text();
  };
  loadCases = async () => {
    let date = moment().startOf("day");
    let csv = await this.getCsvForDate(date);
    if (!csv) {
      date.subtract(1, "day");
      csv = await this.getCsvForDate(date);
    }
    // console.log("csv found", date.format());

    let markers = [];

    Papa.parse(csv, {
      header: true,
      dynamicTyping: true,
      step: line => {
        markers.push(this.buildMarkeFromRow(line, markers.length));
      }
    });
    this.setState({ markers, date });
  };

  buildMarkeFromRow = (line, key) => {
    let {
      Latitude: latitude,
      Longitude: longitude,
      Confirmed: cases,
      Deaths: deaths,
      "Province/State": region,
      "Country/Region": country,
      Recovered: recovered
    } = line.data;
    if ((!cases && !deaths) || !latitude || !longitude) return null;
    const title = region;
    const description = `${cases} cases and ${deaths} deaths in ${region}, ${country}.`;

    const size = 10 + cases.toString().length * 10;
    return (
      <MapView.Marker
        key={key}
        coordinate={{ latitude, longitude }}
        title={title}
        description={description}
      >
        <View style={[styles.marker, { width: size, height: size }]}>
          <Text style={styles.markerText}>{numberWithCommas(cases)}</Text>
        </View>
      </MapView.Marker>
    );
  };

  onChangeDestination = async destination => {
    this.setState({ destination });
    const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${googleApiKey}&input={${destination}}&types=(cities)`;
    const result = await fetch(apiUrl);
    const jsonResult = await result.json();
    this.setState({
      locationPredictions: jsonResult.predictions
    });
  };

  getPlaceDetails = async prediction => {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?key=${googleApiKey}&place_id=${prediction.place_id}`;
    const result = await fetch(url);
    const jsonResult = await result.json();
    const coordinates = _.get(jsonResult, "result.geometry.location");
    if (!coordinates) {
      this.setState({ error: "Unable to get coordinates from place." });
      return;
    }
    const { lat: latitude, lng: longitude } = coordinates;
    this.setState({ zoomedOut: false, latitude, longitude });
  };

  pressedPrediction = async prediction => {
    Keyboard.dismiss();
    this.setState({
      locationPredictions: [],
      destination: prediction.description
    });
    const placeDetails = await this.getPlaceDetails(prediction);
    Keyboard;
  };

  render() {
    const locationPredictions = this.state.locationPredictions.map(
      prediction => (
        <TouchableHighlight
          key={prediction.id}
          onPress={() => this.pressedPrediction(prediction)}
        >
          <Text style={styles.locationSuggestion}>
            {prediction.description}
          </Text>
        </TouchableHighlight>
      )
    );

    const { markers, date, error, destination, zoomedOut } = this.state;

    const dateDaysAgo = date ? moment().diff(date, "day") : null;
    return (
      <View style={styles.container}>
        <MapView
          style={styles.map}
          provider={MapView.PROVIDER_GOOGLE}
          customMapStyle={mapStyle}
          maxZoomLevel={6}
          showsUserLocation={true}
          showsPointsOfInterest={false}
          showsTraffic={false}
          region={{
            latitude: this.state.latitude || defaultCoordinates.latitude,
            longitude: this.state.longitude || defaultCoordinates.longitude,
            latitudeDelta: zoomedOut ? 92.2 : 0.922,
            longitudeDelta: zoomedOut ? 42.1 : 0.421
          }}
          onRegionChangeComplete={() => {
            if (destination !== "") this.setState({ destination: "" });
          }}
        >
          {markers}
        </MapView>

        <SafeAreaView>
          <View style={styles.intro}>
            <Text style={styles.headerText}>
              Track Coronavirus (COVID-19) Disease
            </Text>
            <Text style={styles.introText}>
              The map show numbers of confirmed cases as of{" "}
              {dateDaysAgo ? `${dateDaysAgo} day ago.` : "today."}
              <Text style={styles.emphasizedIntroText}>
                {" "}
                Tap numbers for info.
              </Text>
              {" Learn about coronavirus from "}
              <Link href="https://www.who.int/emergencies/diseases/novel-coronavirus-2019">
                WHO
              </Link>
              .
            </Text>

            <SocialShare />
            {error && <Text style={errorText}>{error}</Text>}
          </View>

          <View style={styles.destinationInputRow}>
            <TextInput
              placeholder="Enter any location in the world"
              style={styles.destinationInput}
              onChangeText={destination => {
                this.setState({ destination });
                this.onChangeDestinationDebounced(destination);
              }}
              value={destination}
            />
            <Ionicons
              name="md-locate"
              size={24}
              color="#023E58"
              onPress={() => this.centerOnCurrentLocation()}
            />
          </View>
          {locationPredictions}
        </SafeAreaView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject
  },

  headerText: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#39767F",
    marginTop: 0,
    marginBottom: 4
  },
  intro: {
    marginTop: 10,
    marginHorizontal: 5,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "white",
    borderWidth: 0.5,
    borderColor: "lightgrey",
    borderBottomWidth: 0
  },
  introText: {
    marginTop: 2,
    // fontSize: 15,
    lineHeight: 18
  },
  emphasizedIntroText: {
    fontWeight: "600"
  },

  destinationInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "lightgrey",
    height: 40,
    marginLeft: 5,
    marginRight: 5,
    paddingRight: 10,
    backgroundColor: "white"
  },
  destinationInput: {
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  locationSuggestion: {
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 15,
    marginHorizontal: 5
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  marker: {
    // backgroundColor: "#39767F",
    backgroundColor: "#023E58",
    borderColor: "white",
    borderWidth: 0.5,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  markerText: {
    // color: "black",
    color: "white",
    fontSize: 13,
    fontWeight: "400"
  },
  errorText: { color: "maroon", marginTop: 10 }
  /* https://www.toptal.com/designers/visual/color-of-the-year-2020 */
});

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
