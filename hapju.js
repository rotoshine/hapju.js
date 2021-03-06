var Bands = new Mongo.Collection('bands');
var Songs = new Mongo.Collection('songs');
var SongComments = new Mongo.Collection('songComments');

moment.locale('ko');
function getMyTwitterId(){
  var user = Meteor.user();
  if(user && user.services && user.services.twitter){
    return Meteor.user().services.twitter.screenName;
  }else {
    return undefined;
  }
}
function getProfileImageByTwitterId(twitterId){
  var user = Meteor.users.findOne({'services.twitter.screenName': twitterId});
  if(user){
    return user.services.twitter.profile_image_url
  }else{
    return '';
  }
}
if (Meteor.isClient) {
  var modalAlert = {
    init: function(){
      var that = this;
      $('#modal-alert').find('button').off('click');
      $('#modal-alert').find('button').on('click', function(){
        that.hide();
      });
    },
    show: function(message){
      this.init();
      $('#modal-alert').find('.panel-body').html(message);
      $('#modal-alert').removeClass('hide');
    },
    hide: function(){
      $('#modal-alert').addClass('hide');
    }
  };

  var modalConfirm = {
    $el: null,
    show: function(params){
      this.$el = $('#modal-confirm');
      var that = this;
      this.$el.removeClass('hide');
      this.$el.find('.panel-body').html(params.template);

      this.$el.find('.modal-confirm-ok-button, .modal-confirm.cancel-button').off('click');
      this.$el.find('.modal-confirm-cancel-button').on('click', function(){
        that.hide();
      });
      this.$el.find('.modal-confirm-ok-button').on('click', function(){
        params.okCallback();
        that.hide();
      });
    },
    hide: function(){
      this.$el = $('#modal-confirm');
      this.$el.addClass('hide');
    }
  };
  var UPLOADED_FILE_KEY = 'uploadedFiles';
  Router.route('/', function () {
    this.render('Index', {
      data: function () {
        var sortQuery = {sort:{ createdAt: -1, limit:10}};
        return {
          newBands: function(){
            return Bands.find({}, sortQuery);
          },
          newSongs: function(){
            return Songs.find({}, sortQuery);
          },
          isNotExistNewSong: function(){
            return Songs.find().count() === 0;
          }
        };
      }
    });
  });

  Router.route('/bands', function(){
    this.render('Bands', {
      data: function(){
        return {
          bands: function(){
            return Bands.find({}, { sort:{ createdAt: -1}});
          }
        }
      }
    });
  });

  Router.route('/bands/:name', function(){
    var band = Bands.findOne({name: this.params.name});    
    if(band !== undefined){
      this.render('BandHome', { data: band });
    }else{
      this.render('BandNotFound', {data:this.params});
    }

  });

  Router.route('/my-bands', function(){
    var user = Meteor.users.findOne(Meteor.userId());
    if(user){
      this.render('MyBands', {
        data: function(){
          return {
            notExistEnteredBand: function(){
              return Bands.find({'members.twitterId': user.services.twitter.screenName}).count() === 0;
            },
            myBands: function(){
              return Bands.find({'members.twitterId': user.services.twitter.screenName});
            }
          }
        }
      });
    }
  });

  Template.Nav.helpers({
    profileImage: function(){
      return Meteor.user().services.twitter.profile_image_url;
    },
    activeIfTemplateIs: function (template) {
      var currentRoute = Router.current();

      return currentRoute &&
        template === currentRoute.lookupTemplate() ? 'active' : '';
    }
  });

  Template.Index.helpers({
    getTextConnector: function(text){
    	var code = text.charCodeAt(text.length - 1) - 44032;

    	// 원본 문구가 없을때는 빈 문자열 반환
    	if (text.length == 0){
          return '';
      }
    	// 한글이 아닐때
    	if (code < 0 || code > 11171){
        return '';
      }

      if(code % 28 === 0){
        return '가';
      }else{
        return '이';
      }
    }
  });

  Template.Bands.helpers({
    bandNotExist: function(){
      return Bands.find().count() === 0;
    }
  });


  var registBand = {
    members: [{
      position: '',
      twitterId: getMyTwitterId()
    }]
  };

  Template.MyBands.helpers({
    registBand: registBand
  });

  Template.RegistBand.helpers({
    filesUploaded: function(){
      return Session.get(UPLOADED_FILE_KEY);
    }
  });

  Template.RegistBand.events({
    'blur #regist-band-name': function(){
      var insertBandName = $('#regist-band-name').val();
      if(insertBandName !== ''){
        var hasExistBand = Bands.find({ name: insertBandName }).count() > 0;
        if(hasExistBand){
          $('#valid-band-name').hide();
          modalAlert.show('같은 밴드 이름이 있습니다.');
        }else{
          $('#valid-band-name').show();
        }
      }
    },
    'click .upload-control.start': function(){
      Uploader.finished = function(index, file){
        if(location.href.indexOf('hapju.winterwolf.me') > -1){
          file.url = file.url.replace('localhost:3000', location.host);
          file.url = file.url.replace('127.0.0.1:3000', location.host);
        }
        $('.uploaded-image').attr('src', file.url);
        Session.set(UPLOADED_FILE_KEY, file);
      }
    },
    'click .add-member': function(){
      Blaze.render(Template.RegistBandMember, $('.regist-band-members')[0]);
    },
    'click .regist-band': function(){
      $('.regist-band-form').submit();
    },
    'submit .regist-band-form': function(){
      var uploadedFile = Session.get(UPLOADED_FILE_KEY);

      // default profile image
      var profileImageUrl = 'https://lh3.ggpht.com/nn0_2f2yehKR7fnMIZ0XrSWbC5Q0VPP7vNmLMV7ndNFinClynZRO4RBTGfbjVOs1fyA=w300-rw';
      if(uploadedFile !== undefined){
        profileImageUrl = uploadedFile.url;
      }

      var name = $('#regist-band-name').val();

      if(name === ''){
        modalAlert.show('밴드 이름을 적어주세요.');
        return false;
      }
      // form validation
      var band = {
        name: name,
        linkName: name.replace(/ /g, '-'),
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        profileImage: profileImageUrl,
        songCount: 0,
        commentCount: 0
      };
      
      $('.regist-band-member').each(function(){
        band.members.push({
          position: $(this).find('.regist-band-member-position').val(),
          twitterId: $(this).find('.regist-band-member-twitter-id').val()
        });
      });
      if(band.members.length === 0){
        modalAlert.show('멤버는 1명 이상 있어야죠.');
        return false;
      }
      if(Bands.find({ name: band.name }).count() > 0){
        modalAlert.show('같은 밴드 이름이 있네요.');
        return false;
      }
      var hasMe = false;
      for(var i = 0; i < band.members.length;i++){
        if(band.members[i].twitterId === getMyTwitterId()){
          hasMe = true;
          break;
        }
      }
      if(hasMe){
        Bands.insert(band);
      }else{
        modalAlert.show('밴드 멤버에 자신이 포함되어 있어야 합니다.');
        return false;
      }

      // form initialize
      $('#regist-band-name').val('');
      $('.regist-band-member').remove();
      $('.uploaded-image').attr('src', '');
      Blaze.render(Template.RegistBandMember, $('.regist-band-members')[0]);

      return false;
    }
  });

  Template.RegistBandMember.events({
    'click .remove-member': function(event){
      $(event.target).parents('.regist-band-member').remove();
    }
  });

  Template.BandHome.helpers({
    isMyBand: function(){
      if(Meteor.user()){
        var currentUserTwitterId = Meteor.user().services.twitter.screenName;
        var band = Bands.findOne({'members.twitterId': currentUserTwitterId});
        return band !== undefined;
      }else{
        return false;
      }
    },
    profileImage: function(){
      return Meteor.user().services.twitter.profile_image_url;
    },
    songs: function(){
      console.log('regist band name:' + this.name);
      return Songs.find({registBandName:this.name}, {sort: {createdAt: -1}});
    },
    comments: function(){
      return SongComments.find({songId: this._id}, {sort:{ createdAt: 1}})
    },
    getMomentTime: function(date){
      return moment(date).from();
    },
    profileImageByTwitterId: getProfileImageByTwitterId,
    voteUsersProfileImage: function(){
      var votes = this.votes;
      var profileImages = [];
      for(var i = 0; i < votes.length; i++){
        profileImages.push(getProfileImageByTwitterId(votes[i].twitterId));
      }
      return profileImages;
    },
    isMySong: function(){
      return this.registUser === getMyTwitterId();
    },
    isNotVote: function(){
      var votes = this.votes;
      for(var i = 0; i < votes.length; i++){
        if(votes[i].twitterId === Meteor.user().services.twitter.screenName){
          return false;
        }
      }
      return true;
    },
    isNotExistSong: function(){
      return Songs.find().count() === 0;
    }
  });
  
  Template.BandHome.events({
    'submit .song-remove-form': function(){
      var songId = this._id;
      if(this.registUser === getMyTwitterId()){
        modalConfirm.show({
          template: '곡을 삭제하시겠습니까?',
          okCallback: function(){
            Songs.remove({ _id: songId }, { justOne: true });
          }
        });
      }
      return false;
    },
    'submit .hapju-vote-form': function(){
      var song = Songs.findOne(this._id);
      var isNotVoted = true;
      for(var i = 0; i < song.votes.length; i++){
        if(song.votes[i].twitterId === getMyTwitterId()){
          isNotVoted = false;
          break;
        }
      }
      if(isNotVoted){
        song.votes.push({
          twitterId: getMyTwitterId(),
          voteDate: new Date()
        });
        song.voteCount = song.votes.length;
        Songs.update(this._id, song);
      }
      return false;
    },
    'submit .add-song-comment-form': function(event){
      var $commentContent = $(event.target).find('.comment-content');
      if($commentContent.val() !== ''){
        var comment = {
          commentUser: getMyTwitterId(),
          content: $commentContent.val(),
          createdAt: new Date(),
          songId: this._id
        };

        SongComments.insert(comment);

        $commentContent.val('');
      }
      return false;
    },
    'submit .add-song-form': function(){
      var $youtubeUrl = $('#youtube-url');
      var youtubeUrl = $youtubeUrl.val();
      
      if(youtubeUrl.indexOf('/watch?v=') > -1){
        youtubeUrl = youtubeUrl.replace('/watch?v=', '/embed/');
      }else if(youtubeUrl.indexOf('youtu.be') > -1){
        youtubeUrl = youtubeUrl.replace('youtu.be', 'youtube.com/embed')
      }
      
      console.log(youtubeUrl);

      var song = {
        originBandName: $('#origin-band-name').val(),
        name: $('#song-name').val(),
        youtubeUrl: youtubeUrl,
        description: $('#description').val(),
        registBandName: this.name,
        commentCount:0, 
        votes: [],
        registUser: Meteor.user().services.twitter.screenName,
        createdAt: new Date()
      };
      if(song.originBandName === ''){
        modalAlert.show('어떤 밴드의 노래인지 좀 적어주시면 어디 덧납니까.');
      }else if(song.name === ''){
        modalAlert.show('노래 이름....적어줘요...');
      }else if(youtubeUrl === '' || youtubeUrl.indexOf('youtube') === -1){
        modalAlert.show('올바른 youtube 링크를 적어주세요.');
      }else{
        Songs.insert(song);

        // band song count add
        Bands.update(
          this._id,
          {
            $inc: {
              songCount: 1
            }
          }
        );

        // form init
        $('#origin-band-name').val('');
        $('#song-name').val('');
        $youtubeUrl.val('');
        $('#description').val('');
      }
      return false;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    UploadServer.init({
      tmpDir: process.env.PWD + '/.uploads/tmp',
      uploadDir: process.env.PWD + '/.uploads',
      getDirectory: function(file, formData){
        return formData.contentType;
      },
      maxPostSize: 4000000,
      finished: function(file, folder, formFileds){
        console.log('Write to database: ' + folder + '/' + file);
      }
    });
  });
}
