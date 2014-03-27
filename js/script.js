var pipeApp = angular.module('pipeApp', []);
pipeApp.controller("pipeController", ['$scope', 'pipeFactory', function ($scope, pipeFactory) {
    $scope.loading = false;
    /*
        Define the list of available pipes with defaults, check local storage
        and if supported and populated for the app, load in the load last session
    */
    $scope.pipes = [    
        {title: "Aggregated News Alerts", pipeId: "fELaGmGz2xGtBTC3qe5lkA"},
        {title: "Business News Feeds", pipeId: "DqsF_ZG72xGLbes9l7okhQ"},
        {title: "Broad News Search", pipeId: "uLI4XFfU3BGd3kpin0artA"}
    ];
    if (localStorage && localStorage.pipeAppPipes) {
       var savedPipes = JSON.parse(localStorage.getItem('pipeAppPipes'));
       if (savedPipes && savedPipes.length > 1) {
            $scope.pipes = savedPipes;
       }
    }
    /*
        Watch for any changes to input pipe Id, to hide the failure dialogue if necessary
    */
    $scope.$watch("pipeId", function (newValue, oldValue) {
        if (newValue !== oldValue) {
            pipeFactory.pipeNotify.toggle(false);
        }
    });
    /*
        Watch for any changes to the pipes object, and if the browser allows local storage, use it
        to persist settings between sessions
    */
    $scope.$watch("pipes.length", function (newValue, oldValue) {
        if (newValue !== oldValue && localStorage) {
            localStorage.setItem('pipeAppPipes', JSON.stringify($scope.pipes));
        }
    });
    /*
        Resolve and add a pipe when a new Id is added / enter pressed on input
    */    
    $scope.resolvePipe = function (event, keyPress) {
        if ((event.keyCode === 13 || event.key === "Enter") || keyPress === false) {
            $scope.pipeId && $scope.loadPipe($scope.pipeId, true);
        }
    };
    /*
        Remove a pipe from the list, if its the currently active one (being read) remove
        the list of items being displayed
    */
    $scope.removePipe = function (index, event) {
        if (event && $(event.target).parent('li').hasClass('active')) {
            $scope.items = [];
        }
        $scope.pipes.splice(index, 1);
    };
    /*
        Load a pipe, based on passed Id
    */
    $scope.loadPipe = function (pipeId, resolve) {
        /*
            If the user is entering a new pipe, don't load it straight into the viewer
            if an existing pipe has been chosen, show the loading icon
        */
        if (resolve !== true) {$scope.loading = true; }
        /*
            Try to load the pipe
        */
        pipeFactory.fetchPipe(pipeId).then(function (response) {
            pipeFactory.pipeNotify.toggle(false);
            /*
                If the user is loading a pipe, and the pipe doesn't exist in the pipes list, add it
            */
            if (!_.some($scope.pipes, function (pipe) {
                return (pipe.pipeId === pipeId);
            })) {
                $scope.pipes.push({title: response.data.value.title, pipeId: $scope.pipeId});
                $scope.pipes = _.sortBy($scope.pipes, function (o) { return o.title; });
            }
            /*
                If the user is loading an existing pipe, parse/format and load up the related items
            */
            if (resolve !== true) {
                /*
                    Per the spec, only show the first ten items- best not done via JS but in the
                    initial call to cut down on memory usage..but implemented in JS below
                */
                response.data.value.items = response.data.value.items.slice(0, 10);
                angular.forEach(response.data.value.items, function (item) {
                    /* 
                    
                    Returned items do not have a dedicated image property, the only way to get an
                    associated image is to scrape the description text/html for <img> tags, grab
                    the first one found then assign the src attribute to an item key. This is
                    resource intensive however, so disabled for this demo.
                    
                    item.image=$('<div/>').html(item.description).find('img').attr('src'); 
                    
                    */
                    item.description = item.description.replace(/<\/?[^>]+>/gi, '').replace(/[&\/\\#,+()$~%.'":*?<>{}]/g,'');
                });
                $scope.items = response.data.value.items;
                $scope.loading = false;
                $('#pipeFeeds li').removeClass('active');
                $('#pipeFeeds li:contains("' + response.data.value.title + '")').addClass('active');
            }
        }, function () {
            $scope.loading = false;
        });
    };
    /*
        Load the external site relating to a clicked item in a new window
    */
    $scope.viewItem = function (url) {
        window.open(url, '_blank');
    };
    /*
        Load the default news pipe on startup
    */
    $scope.loadPipe("DqsF_ZG72xGLbes9l7okhQ");
}]);
pipeApp.factory('pipeFactory', ['$http', '$timeout', function ($http, $timeout) {
    var factory = {
        fetchPipe : function (pipeId) {
            /*
                Grab and return the relevant JSON for a given pip Id...or return
                an error indication and show the failure notification
            */
            return $http.jsonp('http://pipes.yahoo.com/pipes/pipe.run?_id=' + pipeId + '&_render=json&_callback=JSON_CALLBACK').success(function (data) {
                return data;
            }).error(function () {
                factory.pipeNotify.toggle(true);
                return false;
            });
        },
        pipeNotify: {
            /*
                Object created to help handle the 'what if' scenario of a user
                trying to add an invalid pipe Id, in which case the relevant
                HTML element is shown, and will automatically hide after 5s
            */
            timeout: null,
            toggle: function (toggle) {
                if (toggle === false) {
                    $('#pipeNotify').removeClass('active');
                    if (this.timeout) { $timeout.cancel(this.timeout); }
                    this.timeout = null;
                } else {
                    $('#pipeNotify').addClass('active');
                    this.timeout = $timeout(function () {
                        factory.pipeNotify.toggle(false);
                    }, 5000);
                }
            }
        }
    };
    return factory;
}]);