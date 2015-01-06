var Bands = new Mongo.Collection('bands');
var Songs = new Mongo.Collection('songs');

if (Meteor.isClient) {
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
            //return Songs.find({}, sortQuery);
            return [
              {
                originBandName: 'Man With A Mission',
                name: 'Take what u want',
                registBandName: '어그로 크리쳐스',
                youtubeLink: 'http://youtube.com/embed/aIW6UafTwGE'
              }
            ];
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
    console.log(band);
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
        return text;
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
      twitterId: ''
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
    'click .upload-control.start': function(){
      Uploader.finished = function(index, file){
        console.log('uploaded file', file);
        Session.set(UPLOADED_FILE_KEY, file);
      }
    },
    'click .add-member': function(){
      Blaze.render(Template.RegistBandMember, $('.regist-band-members')[0]);
    },
    'click .regist-band': function(){
      var uploadedFile = Session.get(UPLOADED_FILE_KEY);

      var profileImageUrl = 'https://lh3.ggpht.com/nn0_2f2yehKR7fnMIZ0XrSWbC5Q0VPP7vNmLMV7ndNFinClynZRO4RBTGfbjVOs1fyA=w300-rw';
      if(uploadedFile !== undefined){
        profileImageUrl = uploadedFile.url;
      }

      var name = $('#regist-band-name').val();
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

      Bands.insert(band);

      // form initialize
      $('#regist-band-name').val('');
      $('.regist-band-member').remove();
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
    songs: function(){
      return Songs.find({registBandName:this.name});
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
      finished: function(file, folder, formFileds){
        console.log('Write to database: ' + folder + '/' + file);
      }
    });
  });
}
