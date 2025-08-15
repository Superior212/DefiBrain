"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  BookOpen,
  Video,
  FileText,
  Award,
  Clock,
  Users,
  Star,
  Play,
  CheckCircle,
  Lock,
  TrendingUp,
  Shield,
  Zap,
  Target,
  Brain,
} from "lucide-react";

// Mock data for courses
const courses = [
  {
    id: 1,
    title: "DeFi Fundamentals",
    description:
      "Learn the basics of decentralized finance, protocols, and yield farming",
    level: "Beginner",
    duration: "2 hours",
    lessons: 8,
    progress: 75,
    rating: 4.8,
    students: 1234,
    category: "Fundamentals",
    thumbnail: "🏦",
    completed: false,
  },
  {
    id: 2,
    title: "Advanced Yield Strategies",
    description: "Master complex yield farming strategies and risk management",
    level: "Advanced",
    duration: "4 hours",
    lessons: 12,
    progress: 0,
    rating: 4.9,
    students: 567,
    category: "Strategies",
    thumbnail: "📈",
    completed: false,
  },
  {
    id: 3,
    title: "Smart Contract Security",
    description:
      "Understand smart contract risks and how to protect your investments",
    level: "Intermediate",
    duration: "3 hours",
    lessons: 10,
    progress: 100,
    rating: 4.7,
    students: 890,
    category: "Security",
    thumbnail: "🔒",
    completed: true,
  },
  {
    id: 4,
    title: "Portfolio Management",
    description: "Learn how to build and manage a diversified DeFi portfolio",
    level: "Intermediate",
    duration: "2.5 hours",
    lessons: 9,
    progress: 30,
    rating: 4.6,
    students: 678,
    category: "Portfolio",
    thumbnail: "💼",
    completed: false,
  },
];

const articles = [
  {
    id: 1,
    title: "Understanding Impermanent Loss",
    description: "A comprehensive guide to impermanent loss in liquidity pools",
    readTime: "5 min read",
    category: "Risk Management",
    author: "DeFi Expert",
    publishedAt: "2 days ago",
  },
  {
    id: 2,
    title: "Top 10 DeFi Protocols in 2024",
    description: "Explore the most innovative and secure DeFi protocols",
    readTime: "8 min read",
    category: "Protocols",
    author: "Research Team",
    publishedAt: "1 week ago",
  },
  {
    id: 3,
    title: "Gas Optimization Strategies",
    description: "Learn how to minimize transaction costs in DeFi",
    readTime: "6 min read",
    category: "Optimization",
    author: "Tech Lead",
    publishedAt: "3 days ago",
  },
];

const achievements = [
  {
    id: 1,
    title: "DeFi Novice",
    description: "Complete your first DeFi course",
    icon: "🎓",
    unlocked: true,
  },
  {
    id: 2,
    title: "Yield Farmer",
    description: "Master yield farming strategies",
    icon: "🌾",
    unlocked: false,
  },
  {
    id: 3,
    title: "Security Expert",
    description: "Complete all security courses",
    icon: "🛡️",
    unlocked: true,
  },
  {
    id: 4,
    title: "Portfolio Master",
    description: "Build a diversified DeFi portfolio",
    icon: "💎",
    unlocked: false,
  },
];

const getLevelColor = (level: string) => {
  switch (level) {
    case "Beginner":
      return "bg-green-100 text-green-800";
    case "Intermediate":
      return "bg-yellow-100 text-yellow-800";
    case "Advanced":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function EducationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Education</h1>
          <p className="text-muted-foreground mt-2">
            Learn DeFi concepts, strategies, and best practices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Award className="h-4 w-4 mr-2" />
            Achievements
          </Button>
          <Button>
            <Brain className="h-4 w-4 mr-2" />
            AI Tutor
          </Button>
        </div>
      </div>

      {/* Learning Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Courses Completed
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">3 in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Learning Hours
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5</div>
            <p className="text-xs text-muted-foreground">+2.5 this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">2 more to unlock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skill Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Intermediate</div>
            <p className="text-xs text-muted-foreground">Keep learning!</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          {/* Featured Course */}
          <Card>
            <CardHeader>
              <CardTitle>Continue Learning</CardTitle>
              <CardDescription>Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="text-4xl">{courses[0].thumbnail}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{courses[0].title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {courses[0].description}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {courses[0].duration}
                    </span>
                    <span className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {courses[0].lessons} lessons
                    </span>
                    <Badge className={getLevelColor(courses[0].level)}>
                      {courses[0].level}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{courses[0].progress}%</span>
                    </div>
                    <Progress value={courses[0].progress} className="h-2" />
                  </div>
                </div>
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* All Courses */}
          <Card>
            <CardHeader>
              <CardTitle>All Courses</CardTitle>
              <CardDescription>
                Explore our comprehensive DeFi curriculum
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="border rounded-lg p-6 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-3xl">{course.thumbnail}</div>
                      {course.completed && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>

                    <h3 className="font-semibold text-lg mb-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {course.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {course.duration}
                      </span>
                      <span className="flex items-center">
                        <BookOpen className="h-4 w-4 mr-1" />
                        {course.lessons} lessons
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {course.students}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Badge className={getLevelColor(course.level)}>
                          {course.level}
                        </Badge>
                        <Badge variant="outline">{course.category}</Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">
                          {course.rating}
                        </span>
                      </div>
                    </div>

                    {course.progress > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>
                    )}

                    <Button
                      className="w-full"
                      variant={course.completed ? "outline" : "default"}>
                      {course.completed ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Completed
                        </>
                      ) : course.progress > 0 ? (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Continue
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Start Course
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="articles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Latest Articles</CardTitle>
              <CardDescription>
                Stay updated with the latest DeFi insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="border rounded-lg p-6 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {article.description}
                        </p>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {article.readTime}
                          </span>
                          <span>By {article.author}</span>
                          <span>{article.publishedAt}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2 ml-6">
                        <Badge variant="outline">{article.category}</Badge>
                        <Button size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Read
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
              <CardDescription>Track your learning milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`border rounded-lg p-6 transition-colors ${
                      achievement.unlocked
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200 opacity-60"
                    }`}>
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">
                        {achievement.unlocked ? achievement.icon : "🔒"}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {achievement.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                      {achievement.unlocked ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <Lock className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
