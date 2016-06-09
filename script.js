/**
 * Created by ethan on 5/26/16.
 */

var app = angular.module('typingApp', ["chart.js"]);
app.controller('typingController', function($scope, $interval, $http) {
    $scope.typingString = "";

    $scope.userPrompt = false;
    $scope.user = {
        name: "",
        newName: ""
    };

    $scope.difficultyLevel = "All";
    $scope.curDiff = "";

    $scope.stats = {
        graph: {
            labels: [],
            series: ['Raw', 'Corrected'],
            wpms: [[],[]]
        },
        visible: false
    };

    if(localStorage.getItem('user') && localStorage.getItem('user') == "undefined"){
        localStorage.removeItem('user');
    }

    $scope.user.name = localStorage.getItem('user');
    if(!$scope.user.name){
        $scope.userPrompt = true;
    }

    $scope.submit = function(){
            console.log($scope.newName);
            $scope.user.name = $scope.user.newName;
            localStorage.setItem('user', $scope.user.name);
            $scope.userPrompt = false;

    }

    $scope.change = function(){
        $scope.user.newName = "";
        localStorage.removeItem('user');
        $scope.user.name = "";
        $scope.userPrompt = true;
    }

    $scope.arr = [];
    $scope.author = "";
    $scope.rawScore = 0;
    $scope.correctedScore = 0;

    $scope.begin = undefined;

    function loadStrIntoArr(str){
        $scope.arr = [];
        for(var i = 0; i < str.length; i++){
            $scope.arr.push({
                character: str.charAt(i),
                prompted: false,
                typedCorrectly: false,
                typedIncorrectly: false
            });
        }
        $scope.arr[0].prompted = true;
    }

    $scope.arrPosition = 0;

    $scope.complete = false;

    $scope.done = function(){
        var end = new Date();
        var correct = 0, incorrect = 0;

        $scope.arr.forEach(function(obj){
            if(obj.typedCorrectly){
                correct ++;
            }
            else if(obj.typedIncorrectly){
                incorrect++;
            }
            else{
		console.err("There has been a problem");
            }
        });

        var elapsedTime = (end - $scope.begin) / 1000; //time in seconds
        $scope.rawScore = roundDecimal(((correct + incorrect) / 5) / elapsedTime * 60);
        $scope.correctedScore = roundDecimal((((correct + incorrect) / 5) - incorrect) / elapsedTime * 60);
        if($scope.correctedScore < 0){
            $scope.correctedScore = 0;
        }


        var data = {id: $scope.user.name, raw: $scope.rawScore, corrected: $scope.correctedScore, time: end, difficulty: $scope.curDiff};
        $http({
            url:'http://52.36.156.222:8080/',
            method:"POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
        });

    };

    $http.get("http://52.36.156.222:8080/")
        .then(function(response){
            console.log(response);
            loadStrIntoArr(response.data.quote);//$scope.typingString);
            $scope.author = response.data.author;
	    $scope.curDiff = response.data.difficulty;
        })

    $scope.getStats = function(){
        $http.get('http://52.36.156.222:8080/stats?user=' + $scope.user.name)
            .then(function(response){
                console.log(response.data);
                arr = response.data;

                $scope.stats.graph.labels = [];
                $scope.stats.graph.wpms = [[],[]];
                arr.forEach(function(row){
                    $scope.stats.graph.wpms[0].push(row.rawWpm);
                    $scope.stats.graph.wpms[1].push(row.correctedWpm);
                    $scope.stats.graph.labels.push("");
                })
                $scope.stats.visible = true;
            })
    }
});

app.directive('keyPress', function(){
    return function($scope, element, attrs) {
        element.bind("keypress", function(event) {
            if(!$scope.userPrompt && !$scope.complete && event.which >= 32 && event.which <= 126){
                if(!$scope.begin){
                    $scope.begin = new Date();
                }
                $scope.arr[$scope.arrPosition].prompted = false;
                if(String.fromCharCode(event.which) == $scope.arr[$scope.arrPosition].character) {
                    $scope.arr[$scope.arrPosition].typedCorrectly = true;
                }
                else{
                    $scope.arr[$scope.arrPosition].typedIncorrectly = true;
                }

                $scope.arrPosition += 1;
                if($scope.arrPosition == $scope.arr.length){
                    $scope.arrPosition -= 1;
                    $scope.done();
                    $scope.complete = true;
                    console.log($scope.complete);
                    return;
                }

                $scope.arr[$scope.arrPosition].prompted = true;
                event.preventDefault();
                $scope.$apply(function(){
                    $scope.$eval(attrs.keyPress);
                });
            }

        })
    }
})

app.directive('keyDown', function(){
    return function($scope, element, attrs) {
        element.bind("keydown", function(event) {
            if(!$scope.userPrompt && !$scope.complete && event.which == '8'){
                $scope.complete = false;

                if($scope.arrPosition > 0){
                    $scope.arr[$scope.arrPosition].prompted = false;
                    $scope.arrPosition -= 1;
                    $scope.arr[$scope.arrPosition].typedCorrectly = false;
                    $scope.arr[$scope.arrPosition].typedIncorrectly = false;
                    $scope.arr[$scope.arrPosition].prompted = true;
                    $scope.$apply();
                }
                event.preventDefault();
            }
        })
    }
});

function roundDecimal(dec){
    dec *= 100;
    dec = Math.floor(dec);
    dec /= 100;
    return dec;
}
